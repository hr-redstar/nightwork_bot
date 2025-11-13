// src/handlers/uriage/ids.js
// ルーティング識別子（CustomId）とロール種別を一元管理

const IDS = {
  // 設定パネル
  BTN_PANEL_SETUP: 'uriage:panel:setup',
  BTN_ROLE_APPROVER: 'uriage:role:approver',
  BTN_ROLE_VIEWER: 'uriage:role:viewer',
  BTN_ROLE_APPLICANT: 'uriage:role:applicant',
  BTN_CSV_EXPORT: 'uriage:csv:export',

  // 店舗別 売上報告パネル
  BTN_REPORT_OPEN: 'uriage:report:open',

  // スレッド内
  BTN_APPROVE: 'uriage:report:approve',
  BTN_FIX: 'uriage:report:fix',
  BTN_DELETE: 'uriage:report:delete',

  // セレクト
  SEL_STORE: 'uriage:select:store',
  SEL_TEXT_CHANNEL: 'uriage:select:textchannel',
  SEL_ROLE: 'uriage:select:role',
  SEL_CSV_SCOPE: 'uriage:select:csvscope',
  SEL_CSV_FILE: 'uriage:select:csvfile',

  // モーダル
  MODAL_REPORT: 'uriage:modal:report',
  MODAL_FIX: 'uriage:modal:fix',
};

const ROLE_FLOW = {
  APPROVER: 'approver',
  VIEWER: 'viewer',
  APPLICANT: 'applicant',
};

module.exports = { IDS, ROLE_FLOW };