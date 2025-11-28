// src/handlers/uriage/report/index.js
// ----------------------------------------------------
// 売上 報告系 入口
// ----------------------------------------------------

const { URIAGE_REPORT_IDS } = require('./ids');
const {
  openUriageRequestModal,
  handleUriageRequestModalSubmit,
} = require('./requestFlow');
const {
  handleUriageStatusAction,
  handleUriageEditModalSubmit,
} = require('./statusActions');

/**
 * 売上 報告系コンポーネントの共通ハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageReportInteraction(interaction) {
  const customId = interaction.customId || '';

  // ボタン
  if (interaction.isButton()) {
    // 売上報告ボタン → 新規報告モーダル
    if (customId.startsWith(`${URIAGE_REPORT_IDS.OPEN_REQUEST_MODAL_PREFIX}:`)) {
      const storeKey = customId.split(':').slice(-1)[0];
      return openUriageRequestModal(interaction, storeKey);
    }

    // 承認
    if (customId.startsWith(`${URIAGE_REPORT_IDS.BTN_APPROVE_PREFIX}:`)) {
      const recordId = customId.split(':').slice(-1)[0];
      return handleUriageStatusAction(interaction, { action: 'approve', recordId });
    }

    // 修正
    if (customId.startsWith(`${URIAGE_REPORT_IDS.BTN_EDIT_PREFIX}:`)) {
      const recordId = customId.split(':').slice(-1)[0];
      return handleUriageStatusAction(interaction, { action: 'edit', recordId });
    }

    // 削除
    if (customId.startsWith(`${URIAGE_REPORT_IDS.BTN_DELETE_PREFIX}:`)) {
      const recordId = customId.split(':').slice(-1)[0];
      return handleUriageStatusAction(interaction, { action: 'delete', recordId });
    }
  }

  // モーダル送信
  if (interaction.isModalSubmit()) {
    // 新規 売上報告モーダル
    if (customId.startsWith(`${URIAGE_REPORT_IDS.MODAL_REQUEST_PREFIX}:`)) {
      const storeKey = customId.split(':').slice(-1)[0];
      return handleUriageRequestModalSubmit(interaction, storeKey);
    }

    // 修正モーダル
    if (customId.startsWith(`${URIAGE_REPORT_IDS.EDIT_MODAL_PREFIX}:`)) {
      const parts = customId.split(':');
      // ['uriage','report','editModal', recordId, messageId]
      const recordId = parts[3];
      const messageId = parts[4];
      return handleUriageEditModalSubmit(interaction, { recordId, messageId });
    }
  }

  return;
}

module.exports = {
  handleUriageReportInteraction,
};