// src/handlers/keihi/request/index.js
// ----------------------------------------------------
// 経費「申請」フロー用ルーター
// ----------------------------------------------------

const { IDS: REQ_IDS } = require('./requestIds');
const { STATUS_IDS } = require('./statusIds');
const { handleRequestStart, handleRequestItemSelect } = require('./requestStart');
const { handleRequestModalSubmit } = require('./requestModal');
const { handleApproveButton } = require('./action_approve');
const { handleModifyButton, handleModifyModalSubmit } = require('./action_modify');
const { handleDeleteButton } = require('./action_delete');
const {
  openItemConfigModal,
  handleItemConfigModalSubmit,
} = require('./itemConfig');
const {
  openViewRolesSelect,
  openRequestRolesSelect,
  handleViewRoleSelect,
  handleRequestRoleSelect,
} = require('./roleConfig');
const { IDS: KEIHI_IDS } = require('./ids');

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
    // keihi_request:btn:item_config:{storeId}
    if (customId.startsWith(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.ITEM_CONFIG}:`)) {
      const parts = customId.split(':');
      const storeId = parts[parts.length - 1];
      return openItemConfigModal(interaction, storeId);
    }
    if (customId.startsWith(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.VIEW_ROLES}:`)) {
      const parts = customId.split(':');
      const storeId = parts[parts.length - 1];
      return openViewRolesSelect(interaction, storeId);
    }
    if (customId.startsWith(`${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST_ROLES}:`)) {
      const parts = customId.split(':');
      const storeId = parts[parts.length - 1];
      return openRequestRolesSelect(interaction, storeId);
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
    if (customId.startsWith(KEIHI_IDS.PREFIX.VIEW_ROLE_SELECT)) {
      return handleViewRoleSelect(interaction);
    }
    if (customId.startsWith(KEIHI_IDS.PREFIX.REQUEST_ROLE_SELECT)) {
      return handleRequestRoleSelect(interaction);
    }

    return;
  }

  // モーダル
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith(REQ_IDS.REQUEST_MODAL)) {
      return handleRequestModalSubmit(interaction);
    }
    if (customId.startsWith(STATUS_IDS.MODIFY_MODAL)) {
      return handleModifyModalSubmit(interaction);
    }
    if (customId.startsWith(KEIHI_IDS.PREFIX.ITEM_CONFIG_MODAL)) {
      return handleItemConfigModalSubmit(interaction);
    }

    return;
  }
}

module.exports = {
  handleRequestInteraction,
};
