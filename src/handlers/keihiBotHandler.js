// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// 経費機能のエントリーポイント（interactionCreate から呼ばれる）
// ----------------------------------------------------

const logger = require('../utils/logger');

/**
 * keihi_* 系のボタン / セレクト / モーダルの共通エントリ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  const customId = interaction.customId || '';

  // ✅ 経費：設定系（keihi_config / keihi_setting）
  if (customId.startsWith('keihi_config') || customId.startsWith('keihi_setting')) {
    // 遅延 require
    const { handleKeihiSettingInteraction } = require('./keihi/setting/panel');
    return await handleKeihiSettingInteraction(interaction);
  }

  // ✅ 経費：申請/承認系（keihi_request...）
  if (customId.startsWith('keihi_request')) {
    const { handleRequestInteraction } = require('./keihi/request');
    return await handleRequestInteraction(interaction);
  }

  // 想定外
  logger.warn('[keihiBotHandler] unknown keihi_ customId', { customId });
  return;
}

module.exports = {
  handleInteraction,
};
