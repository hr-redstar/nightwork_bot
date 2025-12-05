// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// 経費機能のエントリーポイント（interactionCreate から呼ばれる）
// ./keihi/index.js をラップするだけ
// ----------------------------------------------------

const { handleKeihiInteraction } = require('./keihi');

/**
 * interactionCreate から呼び出されるエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  // ここでは一切ルーティングしないで、全部 keihi/index.js に投げる
  return handleKeihiInteraction(interaction);
}

module.exports = {
  handleInteraction,
};
