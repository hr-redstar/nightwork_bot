/**
 * src/utils/errorHandlers.js
 * エラー処理関連のヘルパー関数
 */
const { MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

/**
 * インタラクションに対して、エフェメラルなエラーメッセージを返信する
 * @param {import('discord.js').Interaction} interaction
 * @param {string} message 返信するメッセージ
 */
async function handleInteractionError(interaction, message) {
  if (!interaction?.isRepliable()) {
    logger.warn('返信不可能なインタラクションに対してエラーメッセージを送信しようとしました。');
    return;
  }

  const replyOptions = { content: message, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp(replyOptions);
    else await interaction.reply(replyOptions);
  } catch (e) {
    logger.error(`❌ インタラクションへのエラー返信に失敗しました (ID: ${interaction.id}):`, e);
  }
}

module.exports = { handleInteractionError };