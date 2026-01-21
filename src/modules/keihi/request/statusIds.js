// src/handlers/keihi/request/statusIds.js
// ----------------------------------------------------
// 経費申請ステータス操作で使う customId プレフィックス
// ----------------------------------------------------

const STATUS_IDS = {
  APPROVE: 'keihi:request:status:approve',
  MODIFY: 'keihi:request:status:modify',
  DELETE: 'keihi:request:status:delete',
  MODIFY_MODAL: 'keihi:request:status:modify_modal',
};

// ※ import 側で const { IDS: STATUS_IDS } = require('./statusIds');
//    としている箇所があったので、互換のため IDS 名でも export しておく
module.exports = {
  STATUS_IDS,
  IDS: STATUS_IDS,
};
