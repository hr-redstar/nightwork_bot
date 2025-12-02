// src/handlers/keihi/request/ids.js
// 経費「申請パネル」用 customId 一元管理

const PREFIX = 'keihi_request';

exports.IDS = {
  // --- ボタン (Action) ---
  // これらは `:storeId` が後ろに付与される想定
  ACTION: {
    ITEM_CONFIG: 'item_config',   // 項目設定
    VIEW_ROLES: 'view_roles',     // 閲覧権限ロール設定
    REQUEST_ROLES: 'request_roles', // 申請権限ロール設定
    REQUEST: 'request',           // 経費申請開始
  },

  // --- インタラクションID プレフィックス ---
  // これらは `:storeId` や `::storeId` が後ろに付与される想定
  PREFIX: {
    BUTTON: `${PREFIX}:btn`,                    // ボタン: `${PREFIX}:btn:${action}:${storeId}`
    VIEW_ROLE_SELECT: `${PREFIX}:sel_view_roles`, // 閲覧ロール選択
    REQUEST_ROLE_SELECT: `${PREFIX}:sel_req_roles`, // 申請ロール選択
    ITEM_CONFIG_MODAL: `${PREFIX}:modal_item_config`, // モーダル: `${PREFIX}:modal_item_config::${storeId}`
  },
};
