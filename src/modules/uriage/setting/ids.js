// src/handlers/uriage/setting/ids.js
// 売上「設定パネル」用 customId 一覧

const PREFIX = 'uriage:setting';

const CSV_PERIOD_VALUE_PREFIX = {
  DATE: 'date:',
  MONTH: 'month:',
  QUARTER: 'quarter:',
  YEAR: 'year:',
};

const IDS = {
  PREFIX,

  // 設定パネル系
  BTN_SET_PANEL: `${PREFIX}:panel:refresh`,
  BTN_SET_APPROVER: `${PREFIX}:approver:set`,
  BTN_EXPORT_CSV: `${PREFIX}:csv:export`,
  BUTTON_EXPORT_CSV: `${PREFIX}:csv:export`, // alias

  SEL_STORE_FOR_PANEL: `${PREFIX}:panel:store_select`,
  PANEL_CHANNEL_PREFIX: `${PREFIX}:panel:channel_select:`,
  SEL_APPROVER_ROLES: `${PREFIX}:approver:role_select`,

  // CSV発行フロー
  SELECT_STORE_FOR_CSV: `${PREFIX}:csv:store_select`,
  BUTTON_CSV_RANGE_DAILY: `${PREFIX}:csv:range:daily`,   // 年月日
  BUTTON_CSV_RANGE_MONTHLY: `${PREFIX}:csv:range:monthly`, // 年月
  BUTTON_CSV_RANGE_YEARLY: `${PREFIX}:csv:range:yearly`,   // 年
  BUTTON_CSV_RANGE_QUARTER: `${PREFIX}:csv:range:quarter`, // 四半期
  SELECT_CSV_TARGET: `${PREFIX}:csv:target_select`,

  // 旧CSVセレクト互換（必要なら維持 - Routerで吸収するが定数は残しておく）
  SEL_CSV_STORE: `${PREFIX}:csv:store_select_legacy`,
  SEL_CSV_PERIOD: `${PREFIX}:csv:period_select_legacy`,
  BTN_CSV_KIND_PREFIX: `${PREFIX}:csv:kind:`,
};

module.exports = { IDS, CSV_PERIOD_VALUE_PREFIX };
