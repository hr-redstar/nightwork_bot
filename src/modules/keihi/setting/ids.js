// src/handlers/keihi/setting/ids.js
// ----------------------------------------------------
// 経費「設定パネル」用 customId 一覧
// ----------------------------------------------------

const PREFIX = 'keihi_config';

const CSV_PERIOD_VALUE_PREFIX = {
  DATE: 'date:',
  MONTH: 'month:',
  QUARTER: 'quarter:',
  YEAR: 'year:',
};

exports.IDS = {
  PREFIX,

  // 既存設定パネル系
  BTN_SET_PANEL: `${PREFIX}:btn:set_panel`,
  BTN_SET_APPROVER: `${PREFIX}:btn:set_approver`,
  BTN_EXPORT_CSV: `${PREFIX}:btn:export_csv`,
  BUTTON_EXPORT_CSV: `${PREFIX}:btn:export_csv`, // alias

  SEL_STORE_FOR_PANEL: `${PREFIX}:sel:store_for_panel`,
  PANEL_CHANNEL_PREFIX: `${PREFIX}:sel:panel_channel:`,
  SEL_APPROVER_ROLES: `${PREFIX}:sel:approver_roles`,

  // CSV発行フロー
  SELECT_STORE_FOR_CSV: `${PREFIX}:select:csv_store`,
  BUTTON_CSV_RANGE_DAILY: `${PREFIX}:btn:csv_range_daily`,     // 年月日
  BUTTON_CSV_RANGE_MONTHLY: `${PREFIX}:btn:csv_range_monthly`, // 年月
  BUTTON_CSV_RANGE_YEARLY: `${PREFIX}:btn:csv_range_yearly`,   // 年
  BUTTON_CSV_RANGE_QUARTER: `${PREFIX}:btn:csv_range_quarter`, // 四半期
  SELECT_CSV_TARGET: `${PREFIX}:select:csv_target`,

  // 旧CSVセレクト互換
  SEL_CSV_STORE: `${PREFIX}:sel:csv_store`,
  SEL_CSV_PERIOD: `${PREFIX}:sel:csv_period`,
  BTN_CSV_KIND_PREFIX: `${PREFIX}:btn:csv_kind:`,
};

exports.CSV_PERIOD_VALUE_PREFIX = CSV_PERIOD_VALUE_PREFIX;
