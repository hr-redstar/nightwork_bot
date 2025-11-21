// src/handlers/config/components/modal/modal_store_edit.js
// ----------------------------------------------------
// 🏪 店舗名を一括編集するモーダル（旧 configModal_store.js の移植版）
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
  saveStoreRoleConfig 
} = require('../../../../utils/config/storeRoleConfigManager');

const { postConfigPanel } = require('../../configPanel');
const { sendSettingLog } = require('../../configLogger');

module.exports = {
  customId: 'CONFIG_STORE_EDIT_MODAL',

  // ---------- モーダル表示 ----------
  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    const modal = new ModalBuilder()
      .setCustomId('CONFIG_STORE_EDIT_MODAL')
      .setTitle('🏪 店舗名編集（複数対応）');

    const input = new TextInputBuilder()
      .setCustomId('store_names')
      .setLabel('店舗名を改行区切りで入力してください')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('例:\n新宿店\n歌舞伎町店\n六本木店')
      .setValue(config.stores.join('\n') || '');

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  },

  // ---------- モーダル送信処理 ----------
  async handle(interaction) {
    const guildId = interaction.guild.id;
    const inputText = interaction.fields.getTextInputValue('store_names');

    const newStores = inputText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const config = await loadStoreRoleConfig(guildId);
    const oldStores = config.stores || [];

    config.stores = newStores;

    await saveStoreRoleConfig(guildId, config);

    // 変更点ログ
    const diff = {
      added: newStores.filter((s) => !oldStores.includes(s)),
      removed: oldStores.filter((s) => !newStores.includes(s)),
    };

    let logMsg = `🏪 **店舗名が更新されました**\n`;
    if (diff.added.length) logMsg += `➕ 追加: ${diff.added.join(', ')}\n`;
    if (diff.removed.length) logMsg += `➖ 削除: ${diff.removed.join(', ')}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
    });

    // 返信
    await interaction.reply({
      content: '✅ 店舗名を更新しました。',
      flags: MessageFlags.Ephemeral,
    });

    // パネル更新
    await postConfigPanel(interaction.channel);
  },
};
