const PREFIX = 'uriage';

const IDS = {
  // 設定パネル (setting/panel.js と共通)
  BTN_PANEL_SETUP: 'uriage-btn-panel-setup',
  BTN_ROLE_APPROVER: 'uriage-btn-role-approver',
  BTN_ROLE_VIEWER: 'uriage-btn-role-viewer',
  BTN_ROLE_APPLICANT: 'uriage-btn-role-applicant',
  BTN_CSV_EXPORT: 'uriage-btn-csv-export',

  // 報告パネル (report/panel.js)
  BTN_REPORT_OPEN: `${PREFIX}:report:btn:open`,

  // スレッド内ボタン (report/handler.js)
  BTN_APPROVE: `${PREFIX}:report:btn:approve`,
  BTN_FIX: `${PREFIX}:report:btn:fix`,
  BTN_DELETE: `${PREFIX}:report:btn:delete`,

  // モーダル (report/handler.js)
  MODAL_REPORT: `${PREFIX}:report:modal:submit`,
  MODAL_FIX: `${PREFIX}:report:modal:fix`,
};

module.exports = { IDS };