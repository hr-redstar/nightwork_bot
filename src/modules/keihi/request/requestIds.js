// src/handlers/keihi/request/requestIds.js
// ----------------------------------------------------
// 経費申請フローで使う customId プレフィックスを集約
// ----------------------------------------------------
//
// 使い方イメージ：
//   経費項目セレクト : `${REQ_IDS.REQUEST_ITEM_SELECT}:${storeId}`
//   申請モーダル     : `${REQ_IDS.REQUEST_MODAL}::${storeId}`
//

const IDS = {
  // 経費項目セレクト
  REQUEST_ITEM_SELECT: 'keihi:request:item:select',

  // 経費申請モーダル
  REQUEST_MODAL: 'keihi:request:submit:modal',
};

module.exports = { IDS };
