﻿﻿﻿// src/handlers/keihiBotHandler.js
const { MessageFlags } = require('discord.js');
const { IDS } = require('./keihi/経費設定/ids');
const {
  handleKeihiPanelAction,
  handleRoleSelectSubmit,
  handleStoreSelectForPanel,
  handleChannelSelectForPanel,
} = require('./keihi/経費設定/keihiPanel_actions');
const { postKeihiReportPanel } = require('./keihi/経費設定/keihiPanel_Report');
const { openItemRegisterModal, handleItemRegisterSubmit } = require('./keihi/経費申請/keihiItemHandler');
const { openCsvExportFlow, handleCsvExportSelection } = require('./keihi/経費設定/keihiCsvHandler');
const { openKeihiReportModal, handleReportSubmit } = require('./keihi/経費申請/keihiReportHandler');
const { handleKeihiRequest, handleKeihiRequestSelect, handleKeihiRequestModal } = require('./keihi/経費申請/keihiRequestHandler');
const { handleKeihiApprove, handleKeihiEdit, handleKeihiDelete, handleKeihiEditModal } = require('./keihi/経費申請/keihiApproveHandler');


/**
 * 経費関連イベントを処理するメインディスパッチャー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    if (interaction.isButton()) {
      const id = interaction.customId;

      // --- 経費設定パネルのボタン ---
      if (id.startsWith('keihi:panel:') || id.startsWith('keihi:role:')) {
        return handleKeihiPanelAction(interaction);
      }
      if (id === IDS.BTN_KEIHI_CSV_EXPORT) return openCsvExportFlow(interaction);

      // --- 店舗別経費申請パネルのボタン ---
      if (id.startsWith(IDS.BTN_ITEM_REGISTER)) {
        return openItemRegisterModal(interaction);
      }
      if (id.startsWith(IDS.BTN_REPORT_OPEN)) {
        return handleKeihiRequest(interaction);
      }

      // --- 経費申請スレッドのボタン ---
      if (id === 'keihi_approve') return handleKeihiApprove(interaction);
      if (id === 'keihi_edit') return handleKeihiEdit(interaction);
      if (id === 'keihi_delete') {
        return handleKeihiDelete(interaction);
      }
    }

    // セレクトメニュー（StringSelect と ChannelSelect 両方を考慮）
    if (interaction.isAnySelectMenu()) {
      const id = interaction.customId || '';

      // --- 経費設定パネルのメニュー ---
      if (id.startsWith('keihi_select_role_')) return handleRoleSelectSubmit(interaction);
      if (id === 'keihi_select_store') return handleStoreSelectForPanel(interaction);
      if (id.startsWith('keihi_select_channel_')) return handleChannelSelectForPanel(interaction);

      // --- 経費申請の項目選択 ---
      if (id.startsWith('keihi:select:')) return handleKeihiRequestSelect(interaction);

      // CSVフローの選択処理
      if (id.startsWith('keihi:select:store:csv') || id.startsWith('keihi:select:csvscope:') || id.startsWith('keihi:select:csvfile:')) {
        return handleCsvExportSelection(interaction);
      }
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (id.startsWith(IDS.MODAL_ITEM_REGISTER)) {
        return handleItemRegisterSubmit(interaction);
      }
      if (id.startsWith('keihi_request_modal_')) {
        return handleKeihiRequestModal(interaction);
      }
      if (id.startsWith('keihi_edit_modal_')) {
        return handleKeihiEditModal(interaction);
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
