// 売上報告系で使う ID 一括管理

const IDS = {
  BUTTON: {
    // 売上報告モーダルを開くボタン（売上報告パネルのボタン）
    REPORT_OPEN: 'uriage_report_open',
  },

  MODAL: {
    // 売上報告モーダル
    REPORT: 'uriage_report_modal',
    // 修正用モーダル
    EDIT: 'uriage_report_edit_modal',
  },

  FIELDS: {
    DATE: 'uriage_report_date',
    TOTAL: 'uriage_report_total',
    CASH: 'uriage_report_cash',
    CARD: 'uriage_report_card',
    URIKAKE: 'uriage_report_urikake',
    EXPENSE: 'uriage_report_expense',
  },

  // 設定パネル用ボタン ID（panel.js で使用）
  BTN_OPEN_PANEL_LOCATION: 'uriage_setting_panel_location',
  BTN_OPEN_APPROVER_ROLE: 'uriage_setting_approver_role',
  BTN_OPEN_CSV_EXPORT: 'uriage_setting_csv_export',

  // セレクト ID
  SELECT_STORE_FOR_PANEL: 'uriage_setting_select_store_panel',
  SELECT_STORE_FOR_APPROVER: 'uriage_setting_select_store_approver',
  SELECT_STORE_FOR_CSV: 'uriage_setting_select_store_csv',
  SELECT_CSV_TYPE: 'uriage_setting_select_csv_type',
  SELECT_CHANNEL_FOR_PANEL: 'uriage_setting_select_channel_panel',
  SELECT_ROLE_FOR_APPROVER: 'uriage_setting_select_role_approver',
};

module.exports = { IDS };
