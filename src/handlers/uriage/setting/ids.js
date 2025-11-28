// src/handlers/uriage/setting/ids.js
// -----------------------------------------
// 売上 設定系 コンポーネントID
// -----------------------------------------

const PREFIX = 'uriage:setting:';

const IDS = Object.freeze({
  PREFIX,

  // メイン設定パネル
  PANEL_MESSAGE: `${PREFIX}panel`,

  // ボタン
  BTN_OPEN_PANEL_LOCATION: `${PREFIX}btnPanelLocation`,  // 売上報告パネル設置
  BTN_OPEN_APPROVER_ROLE: `${PREFIX}btnApproverRole`,    // 承認役職
  BTN_OPEN_CSV_EXPORT: `${PREFIX}btnCsvExport`,          // 売上csv発行

  // セレクト（パネル設置）
  SELECT_STORE_FOR_PANEL: `${PREFIX}selectStoreForPanel`,
  SELECT_CHANNEL_FOR_PANEL: `${PREFIX}selectChannelForPanel`,

  // セレクト（承認役職）
  SELECT_STORE_FOR_APPROVER: `${PREFIX}selectStoreForApprover`,
  SELECT_ROLE_FOR_APPROVER: `${PREFIX}selectRoleForApprover`,

  // セレクト（CSV発行）
  SELECT_STORE_FOR_CSV: `${PREFIX}selectStoreForCsv`,
  SELECT_CSV_TYPE: `${PREFIX}selectCsvType`, // `${SELECT_CSV_TYPE}:${storeKey}`
});

module.exports = { IDS };