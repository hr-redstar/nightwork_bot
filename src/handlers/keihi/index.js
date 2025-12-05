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

  // 設定系: keihi_config:...
  if (customId.startsWith('keihi_config:')) {
    return handleSettingInteraction(interaction);
  }

  // 申請系: keihi_request...
  if (
    customId.startsWith('keihi_request') ||
    (interaction.isModalSubmit() &&
      customId.startsWith('keihi_request'))
  ) {
    return handleRequestInteraction(interaction);
  }

  // 想定外は何もしない
  return;
}

module.exports = {
  handleKeihiInteraction,
};
