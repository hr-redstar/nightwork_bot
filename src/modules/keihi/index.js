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

    logger.debug(`[Keihi] Dispatching to InteractionRouter: ${interaction.customId}`);
    const handled = await router.dispatch(interaction);
    logger.debug(`[Keihi] Interaction handled: ${handled}`);
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  // AppRouter Auto-Discovery Metadata
  prefixes: ['keihi'],
  handleInteraction: handleKeihiInteraction,

  // Legacy Export
  handleKeihiInteraction,
};
