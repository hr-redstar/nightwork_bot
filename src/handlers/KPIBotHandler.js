// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// interactionCreate から呼ばれるラッパー
// ----------------------------------------------------

const { handleKeihiInteraction } = require('./keihi');

/**
 * interactionCreate から呼び出されるエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  return handleKeihiInteraction(interaction);
}

module.exports = {
  handleInteraction,
};
