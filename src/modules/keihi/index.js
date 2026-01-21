const router = require('./router');
const logger = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * 経費機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiInteraction(interaction) {
  try {
    if (!interaction.customId) return;

    const handled = await router.dispatch(interaction);
    if (!handled) {
      logger.debug(`[Keihi] Unhandled interaction: ${interaction.customId}`);
    }
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  handleKeihiInteraction,
};
