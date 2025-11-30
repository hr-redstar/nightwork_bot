// src/handlers/keihi/request/statusActions.js
// ----------------------------------------------------
// 経費申請のステータス操作のハブ
// ----------------------------------------------------

const { handleApproveButton } = require('./action_approve.js');
const { handleModifyButton, handleModifyModalSubmit } = require('./action_modify.js');
const { handleDeleteButton } = require('./action_delete.js');

module.exports = {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModalSubmit,
};