﻿// src/handlers/keihiBotHandler.js
const { MessageFlags } = require('discord.js');
const { IDS } = require('./keihi/経費設定/ids');
const { openApproveRoleSelect, openViewRoleSelect, openApplyRoleSelect, handleRoleSelected } = require('./keihi/経費設定/keihiRoleHandler');
const { postKeihiReportPanel } = require('./keihi/経費設定/keihiPanel_Report');
const { openItemRegisterModal, handleItemRegisterSubmit } = require('./keihi/経費申請/keihiItemHandler');
const { openCsvExportFlow, handleCsvExportSelection } = require('./keihi/経費設定/keihiCsvHandler');
const { openKeihiReportModal, handleReportSubmit } = require('./keihi/経費申請/keihiReportHandler');
const { handleKeihiRequest } = require('./keihi/経費申請/keihiRequestHandler');


/**
 * 経費関連イベントを処理するメインディスパッチャー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      const id = interaction.customId;

      // --- 設定パネルのボタン ---
      if (id === IDS.BTN_KEIHI_PANEL_SETUP) {
        await interaction.deferUpdate();
        return postKeihiReportPanel(interaction);
      }
      if (id === IDS.BTN_KEIHI_ROLE_APPROVER) {
        await interaction.deferUpdate();
        return openApproveRoleSelect(interaction);
      }
      if (id === IDS.BTN_KEIHI_ROLE_VIEWER) {
        await interaction.deferUpdate();
        return openViewRoleSelect(interaction);
      }
      if (id === IDS.BTN_KEIHI_ROLE_APPLICANT) {
        await interaction.deferUpdate();
        return openApplyRoleSelect(interaction);
      }
      if (id === IDS.BTN_KEIHI_CSV_EXPORT) {
        await interaction.deferUpdate();
        return openCsvExportFlow(interaction);
      }
      
      
      const BTN_REPORT_OPEN_ALT = IDS.BTN_REPORT_OPEN.replace(/:/g, '_');
      if (id.startsWith(IDS.BTN_REPORT_OPEN) || id.startsWith(BTN_REPORT_OPEN_ALT)) {
        return openKeihiReportModal(interaction);
      }
    }

    // セレクトメニュー（StringSelect と ChannelSelect 両方を考慮）
    if (interaction.isAnySelectMenu()) {
      const id = interaction.customId || '';

      // 役職選択（文字列セレクト）
      if (id.startsWith('keihi:select:role:')) return handleRoleSelected(interaction);

      // 店舗選択（文字列セレクト） -> postKeihiReportPanel の step フローへ
      if (id === 'keihi:select:store' || id === 'keihi_select_store') {
        return postKeihiReportPanel(interaction, { step: 'select' });
      }

      // CSVフローの選択処理
      if (id.startsWith('keihi:select:store:csv') || id.startsWith('keihi:select:csvscope:') || id.startsWith('keihi:select:csvfile:')) {
        return handleCsvExportSelection(interaction);
      }

      // チャンネル選択（ChannelSelect） -> パネル設置処理
      if (id.startsWith('keihi:select:textchannel:') || id.startsWith('keihi_select_textchannel_')) {
        return postKeihiReportPanel(interaction);
      }
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (id.startsWith(IDS.MODAL_ITEM_REGISTER)) {
        return handleItemRegisterSubmit(interaction);
      }
      
      if (id.startsWith('keihi:modal:report:')) {
        return handleReportSubmit(interaction);
      }
    }
  } catch (err) {
    console.error('❌ keihiBotHandler エラー:', err);
    // Use centralized error handler which respects deferred/replied state
    try {
      const { handleInteractionError } = require('../utils/errorHandlers');
      await handleInteractionError(interaction, '⚠️ 経費処理中にエラーが発生しました。');
    } catch (e) {
      console.error('[keihiBotHandlers] エラーハンドリング中に失敗:', e);
    }
  }
}

module.exports = { handleInteraction };
