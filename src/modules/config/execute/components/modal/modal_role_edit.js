// src/handlers/config/components/modal/modal_role_edit.js
// ----------------------------------------------------
// 👥 役職を改行で一括編集するモーダル（旧 configModal_role.js の最新版）
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const {
  loadStoreRoleConfig,
  saveStoreRoleConfig,
} = require('../../../../../utils/config/storeRoleConfigManager');

const { sendConfigPanel } = require('../../configPanel');
const { sendSettingLog } = require('../../../../../utils/config/configLogger');

module.exports = {
  customId: 'config_role_edit_modal',

  // ---------- モーダル表示 ----------
  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    // 現在の roles は {id,name} の配列 → name のみ抽出して改行表示
    const roleNames = config.roles
      .map((r) => (typeof r === 'string' ? r : r.name)) // 文字列かオブジェクトか判定して名前を取得
      .join('\n');

    const modal = new ModalBuilder()
      .setCustomId('config_role_edit_modal')
      .setTitle('👥 役職名の一括編集');

    const input = new TextInputBuilder()
      .setCustomId('role_names')
      .setLabel('役職名を改行区切りで入力してください')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('例:\n店長\n黒服\nキャスト\nドライバー')
      .setValue(roleNames);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  },

  // ---------- モーダル送信 ----------
  async handle(interaction) {
    const guildId = interaction.guild.id;
    const inputValue = interaction.fields.getTextInputValue('role_names');

    // 改行 → 配列
    const newNames = inputValue
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const config = await loadStoreRoleConfig(guildId);

    // 旧データ
    const oldRoles = config.roles.map((r) => r.name);

    // 新 roles を構築（id = name として生成する簡易方式）
    config.roles = newNames.map((name) => ({
      id: name,
      name,
    }));

    await saveStoreRoleConfig(guildId, config);

    // 変更点比較
    const diff = {
      added: newNames.filter((r) => !oldRoles.includes(r)),
      removed: oldRoles.filter((r) => !newNames.includes(r)),
    };

    // ログ出力
    let logMsg = `👥 **役職一覧が更新されました**\n`;
    if (diff.added.length) logMsg += `➕ 追加: ${diff.added.join(', ')}\n`;
    if (diff.removed.length) logMsg += `➖ 削除: ${diff.removed.join(', ')}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: '役職設定変更',
    });

    await interaction.reply({
      content: '✅ 役職一覧を更新しました。',
      flags: MessageFlags.Ephemeral,
    });

    // 設定パネルの更新
    await sendConfigPanel(interaction.channel);
  },
};
