const router = require('./router');
const logger = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * 売上機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  try {
    if (!interaction.customId) return;

    const handled = await router.dispatch(interaction);
    if (!handled) {
      logger.debug(`[Uriage] Unhandled interaction: ${interaction.customId}`);
    }
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  handleUriageInteraction,
};
