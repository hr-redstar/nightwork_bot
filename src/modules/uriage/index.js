const router = require('./router');
const logger = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * 売上関連のインタラクションをすべて処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  // logger.debug(`[uriage/index] customId=${interaction.customId || ''}`);

  if (!interaction.customId) return;

  try {
    const handled = await router.dispatch(interaction);
    if (!handled) {
      // logger.warn(`[uriage] Unhandled interaction: ${interaction.customId}`);
    }
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  handleUriageInteraction,
};
