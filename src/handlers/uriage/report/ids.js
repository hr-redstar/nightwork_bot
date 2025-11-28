// src/handlers/uriage/report/ids.js
// -----------------------------------------
// 売上 報告系 コンポーネントID
// -----------------------------------------

const PREFIX = 'uriage:report:';

const URIAGE_REPORT_IDS = {
  PREFIX,

  // ボタン: 売上報告モーダルを開く
  // 実際の customId は `${OPEN_REQUEST_MODAL_PREFIX}:${storeKey}`
  OPEN_REQUEST_MODAL_PREFIX: `${PREFIX}openRequestModal`,

  // モーダル
  // 実際の customId は `${MODAL_REQUEST_PREFIX}:${storeKey}`
  MODAL_REQUEST_PREFIX: `${PREFIX}modalRequest`,

  // ステータス変更＆操作ボタン
  // `${BTN_APPROVE_PREFIX}:${recordId}` など
  BTN_APPROVE_PREFIX: `${PREFIX}approve`,
  BTN_EDIT_PREFIX: `${PREFIX}edit`,
  BTN_DELETE_PREFIX: `${PREFIX}delete`,

  // 修正モーダル
  // `${EDIT_MODAL_PREFIX}:${recordId}:${messageId}`
  EDIT_MODAL_PREFIX: `${PREFIX}editModal`,
};

module.exports = { URIAGE_REPORT_IDS };