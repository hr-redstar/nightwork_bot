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
const showModalSafe = require('../../../../../utils/showModalSafe');
const logger = require('../../../../../utils/logger');

module.exports = {
  customId: 'config_role_edit_modal',

  // ---------- モーダル表示 ----------
  async show(interaction) {
    // 💡 Platinum Rule: showModal は即座に呼ぶ（3秒ルール厳守）
    // 初期値なしで即座に表示
    const modal = new ModalBuilder()
      .setCustomId('config_role_edit_modal')
      .setTitle('👥 役職名の一括編集');

    const input = new TextInputBuilder()
      .setCustomId('role_names')
      .setLabel('役職名を改行区切りで入力してください')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('例:\n店長\n黒服\nキャスト\nドライバー')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return showModalSafe(interaction, modal);
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

    // 💡 Platinum Strategy: 即座に reply
    await interaction.reply({
      content: '⏳ 役職一覧を更新しています...',
      flags: MessageFlags.Ephemeral,
    });

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
    try {
      let logMsg = '👥 役職一覧が更新されました';
      if (diff.added.length) logMsg += `\n➕ 追加: ${diff.added.join(', ')}`;
      if (diff.removed.length) logMsg += `\n➖ 削除: ${diff.removed.join(', ')}`;

      await sendSettingLog(interaction, {
        title: '👥 役職設定変更',
        description: logMsg,
        color: 0x00b894,
      });
    } catch (err) {
      logger.error('[modal_role_edit] sendSettingLog failed:', err);
    }

    // 最終応答
    await interaction.editReply({
      content: '✅ 役職一覧を更新しました。',
    });

    // 設定パネルの更新（非同期）
    setImmediate(async () => {
      try {
        await sendConfigPanel(interaction.channel);
      } catch (err) {
        logger.error('[modal_role_edit] Panel update failed:', err);
      }
    });
  },
};
