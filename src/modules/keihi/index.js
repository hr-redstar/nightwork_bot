const router = require('./router');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * keihi_* 系インタラクションのエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiInteraction(interaction) {
  try {
    const handled = await router.dispatch(interaction);
    if (!handled) {
      // 必要ならログ出力
      // console.log(`[Keihi] Unhandled interaction: ${interaction.customId}`);
    }
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  handleKeihiInteraction,
};
