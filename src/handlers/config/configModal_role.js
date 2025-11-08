// src/handlers/config/configModal_role.js
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
 * 役職編集モーダルを表示
 */
async function showRoleEditModal(interaction) {
  const guildId = interaction.guild.id;
  const config = await loadStoreRoleConfig(guildId);

  const modal = new ModalBuilder()
    .setCustomId('modal_role_edit')
    .setTitle('👥 役職編集');

  const input = new TextInputBuilder()
    .setCustomId('role_names')
    .setLabel('役職名を改行区切りで入力してください')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('例:\n店長\n黒服\nキャスト\nドライバー')
    .setValue(config?.roles?.join('\n') || '');

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * モーダル送信後の処理
 */
async function handleRoleEditSubmit(interaction) {
  const guildId = interaction.guild.id;
  const inputValue = interaction.fields.getTextInputValue('role_names');
  const newRoles = inputValue
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const config = await loadStoreRoleConfig(guildId);
  const oldRoles = config.roles || [];

  config.roles = newRoles;
  await saveStoreRoleConfig(guildId, config);

  // 差分を取得
  const diff = {
    added: newRoles.filter((r) => !oldRoles.includes(r)),
    removed: oldRoles.filter((r) => !newRoles.includes(r)),
  };

  let logMsg = `👥 **役職が更新されました**\n`;
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

  // 設定パネルを更新
  await postConfigPanel(interaction.channel);
}

module.exports = { showRoleEditModal, handleRoleEditSubmit };
