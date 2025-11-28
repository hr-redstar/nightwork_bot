// src/handlers/uriage/report/ids.js

const PREFIX = 'uriage:report';

const IDS = {
  // 報告パネルのボタン
  BTN_REPORT_OPEN: `${PREFIX}:btn:open`, // :storeId が付与される

  // 報告スレッド内のボタン
  BTN_APPROVE: `${PREFIX}:btn:approve`,
  BTN_FIX: `${PREFIX}:btn:fix`,
  BTN_DELETE: `${PREFIX}:btn:delete`,

  // モーダル
  MODAL_REPORT: `${PREFIX}:modal:submit`, // :storeId が付与される
  MODAL_FIX: `${PREFIX}:modal:fix`,       // :messageId が付与される
};

module.exports = { IDS };