// src/handlers/keihi/request/statusActions.js
// ----------------------------------------------------
// 経費申請のステータス操作のハブ
//   - 承認ボタン
//   - 修正ボタン＆修正モーダル
//   - 削除ボタン
// ----------------------------------------------------

const { handleApproveButton } = require('./action_approve');
const { handleModifyButton, handleModifyModalSubmit } = require('./action_modify');
const { handleDeleteButton } = require('./action_delete');

module.exports = {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModalSubmit,
};
