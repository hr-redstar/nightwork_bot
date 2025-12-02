// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// 経費機能のエントリーポイント（interactionCreate から呼ばれる）
// ----------------------------------------------------

const { handleKeihiInteraction } = require('./keihi');

/**
 * interactionCreate から呼び出されるエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  // ここでは CSV とかをいじらず、全部 keihi/index.js に丸投げする
  return handleKeihiInteraction(interaction);
}

module.exports = {
  handleInteraction,
};
