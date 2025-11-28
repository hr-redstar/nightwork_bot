// src/handlers/keihi/request/keihiPanel_Request.js
// ----------------------------------------------------
// 経費「申請パネル」用のラッパーファイル
// 実処理は ./index.js に分離
// ----------------------------------------------------

const { handleKeihiRequestInteraction } = require('./index');

module.exports = {
  handleKeihiRequestInteraction,
};