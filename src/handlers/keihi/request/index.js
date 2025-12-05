// src/handlers/keihi/request/index.js
// ----------------------------------------------------
// 経費「申請」フロー用ルーター
// ----------------------------------------------------

const { IDS: REQ_IDS } = require('./requestIds');
const { STATUS_IDS } = require('./statusIds');
const { handleRequestStart, handleRequestItemSelect } = require('./requestStart');
const { handleRequestModalSubmit } = require('./requestModal');
const { handleApproveButton } = require('./action_approve');
const { handleModifyButton } = require('./action_modify');
const { handleDeleteButton } = require('./action_delete');

/**
 * 経費申請系インタラクションを処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handleRequestInteraction(interaction) {
  // ボタン
  if (interaction.isButton()) {
    const { customId } = interaction;

    // keihi_request:btn:request:{storeId}
    if (customId.startsWith('keihi_request:btn:request:')) {
      const parts = customId.split(':');
      const storeId = parts[parts.length - 1];
      return handleRequestStart(interaction, storeId);
    }

    if (customId.startsWith(STATUS_IDS.APPROVE)) {
      return handleApproveButton(interaction);
    }
    if (customId.startsWith(STATUS_IDS.MODIFY)) {
      return handleModifyButton(interaction);
    }
    if (customId.startsWith(STATUS_IDS.DELETE)) {
      return handleDeleteButton(interaction);
    }

    return;
  }

  // セレクトメニュー
  if (interaction.isAnySelectMenu()) {
    const { customId } = interaction;

    if (customId.startsWith(REQ_IDS.REQUEST_ITEM_SELECT)) {
      return handleRequestItemSelect(interaction);
    }

    return;
  }

  // モーダル
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith(REQ_IDS.REQUEST_MODAL)) {
      return handleRequestModalSubmit(interaction);
    }

    return;
  }
}

module.exports = {
  handleRequestInteraction,
};
