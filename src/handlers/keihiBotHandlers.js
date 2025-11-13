﻿﻿﻿// src/handlers/keihiBotHandler.js
const { MessageFlags } = require('discord.js');
const { IDS } = require('./keihi/ids');
const { openApproveRoleSelect, openViewRoleSelect, openApplyRoleSelect, handleRoleSelected } = require('./keihi/keihiRoleHandler');
const { postKeihiReportPanel } = require('./keihi/keihiPanel_Report');
const { openItemRegisterModal, handleItemRegisterSubmit } = require('./keihi/keihiItemHandler');
// keihi request/report handlers (legacy underscore IDs are produced in some flows)
const { handleKeihiRequest, handleKeihiRequestSelect, handleKeihiRequestModal } = require('./keihi/keihiRequestHandler');
const { handleKeihiApprove, handleKeihiEdit, handleKeihiEditModal, handleKeihiDelete } = require('./keihi/keihiApproveHandler');
// const { openCsvExportFlow, handleCsvExportSelection } = require('./keihi/keihiCsvHandler'); // Placeholder
// const { openKeihiReportModal, handleReportSubmit } = require('./keihi/keihiReportHandler');

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
      if (id === IDS.BTN_KEIHI_ROLE_APPROVER) return openApproveRoleSelect(interaction);
      if (id === IDS.BTN_KEIHI_ROLE_VIEWER) return openViewRoleSelect(interaction);
      if (id === IDS.BTN_KEIHI_ROLE_APPLICANT) return openApplyRoleSelect(interaction);
      
      // --- 店舗別パネルのボタン ---
      // 互換性のため旧フォーマット（underscore）も許容する
      const BTN_ITEM_REGISTER_ALT = IDS.BTN_ITEM_REGISTER.replace(/:/g, '_');
      if (id.startsWith(IDS.BTN_ITEM_REGISTER) || id.startsWith(BTN_ITEM_REGISTER_ALT)) {
        return openItemRegisterModal(interaction);
      }

      // 経費申請ログに出力された旧形式ボタン (例: keihi_request_{store})
      if (id && id.startsWith('keihi_request_')) {
        return handleKeihiRequest(interaction);
      }

      // スレッド内の操作ボタン（承認 / 修正 / 削除）
      if (id === 'keihi_approve') return handleKeihiApprove(interaction);
      if (id === 'keihi_edit') return handleKeihiEdit(interaction);
      if (id === 'keihi_delete') return handleKeihiDelete(interaction);
      return;
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

      // 経費申請フローの項目選択（旧形式の select）
      if (id && id.startsWith('keihi_request_select_')) {
        return handleKeihiRequestSelect(interaction);
      }

      // チャンネル選択（ChannelSelect） -> パネル設置処理
      if (id.startsWith('keihi:select:textchannel:') || id.startsWith('keihi_select_textchannel_')) {
        return postKeihiReportPanel(interaction);
      }
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      
      const MODAL_ITEM_REGISTER_ALT = IDS.MODAL_ITEM_REGISTER.replace(/:/g, '_');
      if (id.startsWith(IDS.MODAL_ITEM_REGISTER) || id.startsWith(MODAL_ITEM_REGISTER_ALT)) {
        return handleItemRegisterSubmit(interaction);
      }
      // keihi request modal (旧形式)
      if (id && id.startsWith('keihi_request_modal_')) return handleKeihiRequestModal(interaction);
      // keihi edit modal
      if (id && id.startsWith('keihi_edit_modal_')) return handleKeihiEditModal(interaction);
      return;
    }
  } catch (err) {
    console.error('❌ keihiBotHandler エラー:', err);
    if (!interaction.replied) {
      await interaction.reply({
        content: '⚠️ 経費処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = { handleInteraction };

/*
  // --- 旧ハンドラの呼び出し（移行期間中） ---
  const legacyKeihiHandlers = require('./legacy/keihiBotHandlers_old');
  if (interaction.customId.startsWith('keihi_')) {
    return legacyKeihiHandlers.handleInteraction(interaction);
  }
*/
