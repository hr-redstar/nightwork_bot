// src/handlers/keihi/request/statusIds.js
// ----------------------------------------------------
// 経費申請ステータス操作で使う customId プレフィックス
// ----------------------------------------------------

const STATUS_IDS = {
  APPROVE: 'keihi_request_approve',
  MODIFY: 'keihi_request_modify',
  DELETE: 'keihi_request_delete',
  MODIFY_MODAL: 'keihi_request_modify_modal',
};

module.exports = { STATUS_IDS };
