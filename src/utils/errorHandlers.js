const logger = require('./logger');

async function handleInteractionError(interaction, error) {
  logger.error(error);

  const message = '⚠️ 処理中にエラーが発生しました。管理者に連絡してください。';

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  } catch (e) {
    logger.error('Failed to send error reply', e);
  }
}

module.exports = {
  handleInteractionError,
};