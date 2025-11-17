﻿// src/handlers/keihiBotHandler.js
//
// 経費関連の全インタラクションを一元処理する中心ハンドラー
//

const { IDS } = require('./keihi/経費設定/ids');

// --- 経費設定（Config） ---
const {
  openApproveRoleSelect,
  openViewRoleSelect,
  openApplyRoleSelect,
  handleRoleSelected,
} = require('./keihi/経費設定/keihiRoleHandler');

const { postKeihiReportPanel, openKeihiReportModal, handleReportSubmit } = require('./keihi/経費設定/keihiPanel_Report');
const { updateKeihiPanel } = require('./keihi/経費設定/keihiPanel_Config');

// --- 経費申請（Report） ---
const { openItemRegisterModal, handleItemRegisterSubmit } = require('./keihi/経費申請/keihiItemHandler');
const { handleKeihiRequest } = require('./keihi/経費申請/keihiRequestHandler');

const { openCsvExportFlow, handleCsvExportSelection } = require('./keihi/経費設定/keihiExportHandler');


/**
 * 経費関連のインタラクションをすべて集約
 */
async function handleInteraction(interaction) {
  try {
    const id = interaction.customId || "";

    // ============================================================
    // ① 経費設定パネル関連
    // ============================================================
    if (id === IDS.BTN_KEIHI_PANEL_SETUP) {
      await interaction.deferUpdate();
      return postKeihiReportPanel(interaction);
    }

    // --- 承認 / 閲覧 / 申請 役職設定ボタン ---
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

    // --- CSV Export ---
    if (id === IDS.BTN_KEIHI_CSV_EXPORT) {
      await interaction.deferUpdate();
      return openCsvExportFlow(interaction);
    }

    // ============================================================
    // ② 経費パネル設置のセレクト処理
    // ============================================================
    if (interaction.isAnySelectMenu()) {
      if (id.startsWith('keihi:select:role:')) {
        return handleRoleSelected(interaction);
      }
      if (id === 'keihi:select:store' || id === 'keihi_select_store') {
        return postKeihiReportPanel(interaction, { step: 'select' });
      }
      if (id.startsWith('keihi:select:textchannel:')) {
        return postKeihiReportPanel(interaction);
      }

      // CSV関連
      if (
        id.startsWith('keihi:select:store:csv') ||
        id.startsWith('keihi:select:csvscope:') ||
        id.startsWith('keihi:select:csvfile:')
      ) {
        return handleCsvExportSelection(interaction);
      }
    }

    // ============================================================
    // ③ 経費申請パネル関連（項目登録 / 申請）
    // ============================================================

    // --- 経費項目登録 ---
    if (id.startsWith(IDS.BTN_ITEM_REGISTER)) {
      return openItemRegisterModal(interaction);
    }

    // --- 経費申請 ---
    if (id.startsWith(IDS.BTN_REPORT_OPEN)) {
      return openKeihiReportModal(interaction);
    }

    // --- 旧ボタン互換（keihi_request_）---
    if (id.startsWith("keihi_request_")) {
      return handleKeihiRequest(interaction);
    }

    // ============================================================
    // ④ モーダル
    // ============================================================
    if (interaction.isModalSubmit()) {
      // 項目登録
      if (id.startsWith(IDS.MODAL_ITEM_REGISTER)) {
        return handleItemRegisterSubmit(interaction);
      }
      // 経費申請モーダル
      if (id.startsWith('keihi:modal:report:')) {
        return handleReportSubmit(interaction);
      }
    }

  } catch (err) {
    console.error("❌ keihiBotHandler エラー:", err);

    try {
      const { handleInteractionError } = require('../utils/errorHandlers');
      await handleInteractionError(interaction, '⚠️ 経費処理中にエラーが発生しました。');
    } catch (e) {
      console.error("[keihiBotHandler] エラー処理中のエラー:", e);
    }
  }
}

module.exports = { handleInteraction };
