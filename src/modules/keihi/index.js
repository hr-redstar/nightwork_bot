// src/handlers/keihi/index.js
// ----------------------------------------------------
// 経費機能ルーター
//   - customId / modalId から「設定 or 申請」を振り分け
// ----------------------------------------------------

const { handleSettingInteraction } = require('./setting');
const { handleRequestInteraction } = require('./request');

/**
 * keihi_* 系インタラクションのエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiInteraction(interaction) {
  const customId = interaction.customId || '';

  if (customId.startsWith('keihi_config') || customId.startsWith('keihi_setting')) {
    return await handleSettingInteraction(interaction);
  }

  if (customId.startsWith('keihi_request')) {
    return await handleRequestInteraction(interaction);
  }

  return;
}

module.exports = {
  handleKeihiInteraction,
};
