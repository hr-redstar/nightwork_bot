// src/handlers/uriage/report/index.js
// ----------------------------------------------------
// 売上報告・承認・修正フローのインタラクションを処理する
// ----------------------------------------------------

const { IDS } = require('./ids'); // report/ids.js を参照
const { openUriageReportModal, handleReportSubmit } = require('./requestFlow');
const { handleApprove, handleReportFixSubmit, handleDelete } = require('./statusActions');

async function handleUriageReportInteraction(interaction) {
  const { customId } = interaction;

  // 報告モーダルを開く
  if (customId.startsWith(IDS.BTN_REPORT_OPEN)) return openUriageReportModal(interaction); // uriage:report:btn:open:storeId

  // スレッド内のボタン
  if (customId === IDS.BTN_APPROVE) return handleApprove(interaction);
  if (customId === IDS.BTN_FIX) return handleReportFixSubmit(interaction, { openOnly: true });
  if (customId === IDS.BTN_DELETE) return handleDelete(interaction);

  // モーダル送信 (uriage:report:modal:submit:storeId)
  if (customId.startsWith(IDS.MODAL_REPORT)) return handleReportSubmit(interaction);
  // モーダル送信 (uriage:report:modal:fix:messageId)
  if (customId.startsWith(IDS.MODAL_FIX)) return handleReportFixSubmit(interaction);
}

module.exports = {
  handleUriageReportInteraction,
};