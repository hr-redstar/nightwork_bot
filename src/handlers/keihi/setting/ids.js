// src/handlers/keihi/setting/ids.js
// ----------------------------------------------------
// 経費「設定パネル」用 customId を一元管理
// prefix は keihi_config: で統一
// ----------------------------------------------------

const PREFIX = 'keihi_config';

const IDS = {
  // ボタン
  BTN_SET_PANEL: `${PREFIX}:btn:set_panel`,
  BTN_SET_APPROVER: `${PREFIX}:btn:set_approver`,
  BTN_EXPORT_CSV: `${PREFIX}:btn:export_csv`,

  // セレクト
  SEL_STORE_FOR_PANEL: `${PREFIX}:sel:store_for_panel`,
  SEL_APPROVER_ROLES: `${PREFIX}:sel:approver_roles`,
  SEL_CSV_STORE: `${PREFIX}:sel:csv_store`,
  SEL_CSV_PERIOD: `${PREFIX}:sel:csv_period`,

};

// チャンネル選択用 prefix
const PANEL_CHANNEL_PREFIX = `${PREFIX}:sel:panel_channel:`;

// CSV 期間選択の value にくっつける prefix
const CSV_PERIOD_VALUE_PREFIX = {
  DATE: 'date:',
  MONTH: 'month:',
  QUARTER: 'quarter:',
}

module.exports = {
  IDS,
  PANEL_CHANNEL_PREFIX,
  CSV_PERIOD_VALUE_PREFIX,
};
