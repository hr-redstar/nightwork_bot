// src/handlers/keihi/setting/ids.js
// ----------------------------------------------------
// 経費「設定パネル」用 customId 一元管理
// ----------------------------------------------------

const PREFIX = 'keihi_config';

exports.IDS = {
  // 設定パネルのボタン
  BTN_SET_PANEL: `${PREFIX}:btn:set_panel`,     // 経費パネル設置
  BTN_SET_APPROVER: `${PREFIX}:btn:set_approver`, // 承認役職
  BTN_EXPORT_CSV: `${PREFIX}:btn:export_csv`,  // 経費csv発行

  // CSV 用セレクト
  SEL_CSV_STORE: `${PREFIX}:sel:csv_store`,
  SEL_CSV_PERIOD: `${PREFIX}:sel:csv_period`,

  // ほか（必要ならここに追加）
};
