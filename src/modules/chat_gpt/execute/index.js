// src/handlers/chat_gpt/index.js
const { PermissionsBitField } = require('discord.js');
const logger = require('../../../utils/logger');
const { postChatGptSettingPanel } = require('./panel');

/**
 * /設定chat_gpt エントリーポイント
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleSettingChatGpt(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    const { MessageFlags } = require('discord.js');
    return interaction.reply({
      content: 'このコマンドは管理者のみ使用できます。',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    await postChatGptSettingPanel(interaction);
  } catch (err) {
    logger.error('[chat_gpt] 設定パネル表示エラー:', err);
    throw err;
  }
}

module.exports = {
  handleSettingChatGpt,
};
