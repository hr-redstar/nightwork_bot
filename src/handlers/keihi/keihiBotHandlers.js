// src/handlers/keihi/keihiBotHandlers.js
// ----------------------------------------------------
// 経費関連のインタラクションを統括するハンドラ
// customId のプレフィックスを見て、各機能に処理を振り分ける
// ----------------------------------------------------

const { handleKeihiSettingInteraction } = require('./setting');
const { handleKeihiRequestInteraction } = require('./request');

/**
 * 経費関連のインタラクションをすべて処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiInteraction(interaction) {
  if (!interaction.customId) return;

  const { customId } = interaction;

  // 設定パネル（keihi_config:xxxx）からのインタラクション
  if (customId.startsWith('keihi_config:')) {
    return handleKeihiSettingInteraction(interaction);
  }

  // 申請パネル（keihi_request:xxxx）からのインタラクション
  if (customId.startsWith('keihi_request')) { // ボタンとモーダル両方に対応
    return handleKeihiRequestInteraction(interaction);
  }
}

module.exports = {
  handleKeihiInteraction,
};