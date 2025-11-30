// src/handlers/keihi/request/ids.js
// 経費「申請パネル」用 customId 一元管理

const PREFIX = 'keihi_request';

exports.IDS = {
  // --- ボタン (Action) ---
  // これらは `:storeId` が後ろに付与される
  ACTION: {
    ITEM_CONFIG: 'item_config',
    VIEW_ROLES: 'view_roles',
    REQUEST_ROLES: 'request_roles',
    REQUEST: 'request',
  },

  // --- インタラクションID プレフィックス ---
  // これらは `:storeId` や `::storeId` が後ろに付与される
  PREFIX: {
    BUTTON: `${PREFIX}:btn`,
    VIEW_ROLE_SELECT: `${PREFIX}:sel_view_roles`,
    REQUEST_ROLE_SELECT: `${PREFIX}:sel_req_roles`,
    ITEM_CONFIG_MODAL: `${PREFIX}:modal_item_config`, // `::storeId`
  },
};
