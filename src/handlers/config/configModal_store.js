// src/handlers/config/configModal_store.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const { loadStoreRoleConfig, saveStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { postConfigPanel } = require('./configPanel');
const { sendSettingLog } = require('./configLogger');

/**
 * 店舗名編集モーダルを表示
 */
async function showStoreEditModal(interaction) {
  const guildId = interaction.guild.id;
  const config = await loadStoreRoleConfig(guildId);

  const modal = new ModalBuilder()
    .setCustomId('modal_store_edit')
    .setTitle('🏪 店舗名編集');

  const input = new TextInputBuilder()
    .setCustomId('store_names')
    .setLabel('店舗名を改行区切りで入力してください')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例:\n新宿店\n歌舞伎町店\n六本木店')
    .setValue(config.stores?.join('\n') || '');

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * モーダル送信後の処理
 */
async function handleStoreEditSubmit(interaction) {
  const guildId = interaction.guild.id;
  const inputValue = interaction.fields.getTextInputValue('store_names');
  const newStores = inputValue
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const config = await loadStoreRoleConfig(guildId);
  const oldStores = config.stores || [];

  config.stores = newStores;
  await saveStoreRoleConfig(guildId, config);

  // ログ出力
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

  await interaction.reply({
    content: '✅ 店舗名を更新しました。',
    flags: MessageFlags.Ephemeral,
  });

  // 設定パネルを更新
  await postConfigPanel(interaction.channel);
}

module.exports = { showStoreEditModal, handleStoreEditSubmit };
