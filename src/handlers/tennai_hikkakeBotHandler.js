// src/handlers/tennai_hikkakeBotHandler.js
const { MessageFlags } = require('discord.js');
const { handleInteractionError } = require('../utils/errorHandlers');
const { handleHikkakeSetup, handleStoreSelectForHikkake, handleChannelSelectForHikkake } = require('./tennai_hikkake/hikkakeSetup');
const { handleHikkakeReport, handleHikkakeReportModal } = require('./tennai_hikkake/hikkakeReport');

/**
 * 「店内状況・ひっかけ」関連のインタラクションを処理する
 * @param {import('discord.js').Interaction} interaction
 */
async function handleTennaiHikkakeInteraction(interaction) {
  try {
    const { customId } = interaction;

    // --- ボタン ---
    if (interaction.isButton()) {
      if (customId === 'setup_hikkake_all') return handleHikkakeSetup(interaction);
      if (customId === 'setup_hikkake_store') return handleHikkakeSetup(interaction, { storeOnly: true });
      if (customId.startsWith('hikkake_report_')) return handleHikkakeReport(interaction);
    }

    // --- セレクトメニュー ---
    if (interaction.isStringSelectMenu()) {
      if (customId === 'select_store_for_hikkake') return handleStoreSelectForHikkake(interaction);
    }
    if (interaction.isChannelSelectMenu()) {
      if (customId.startsWith('select_channel_for_hikkake_')) return handleChannelSelectForHikkake(interaction);
    }

    // --- モーダル ---
    if (interaction.isModalSubmit()) {
      if (customId.startsWith('hikkake_report_modal_')) return handleHikkakeReportModal(interaction);
    }
  } catch (error) {
    await handleInteractionError(interaction, '⚠️ 店内状況・ひっかけ機能でエラーが発生しました。');
  }
}

module.exports = handleTennaiHikkakeInteraction;