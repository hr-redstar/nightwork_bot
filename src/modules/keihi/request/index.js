// src/handlers/keihi/request/index.js
// ----------------------------------------------------
// �o���u�\���v�t���[�p���[�^�[
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
 * �o���\���n�C���^���N�V������?E?E
 * @param {import('discord.js').Interaction} interaction
 */
async function handleRequestInteraction(interaction) {
  // �{�^��
  if (interaction.isButton()) {
    const { customId } = interaction;

    const REQ_BTN_PREFIX = 'keihi_request:btn:request:';
    if (customId.startsWith(REQ_BTN_PREFIX)) {
      const storeKey = customId.slice(REQ_BTN_PREFIX.length);
      return handleRequestStart(interaction, storeKey);
    }

    const ITEM_PREFIX = `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.ITEM_CONFIG}:`;
    if (customId.startsWith(ITEM_PREFIX)) {
      const storeKey = customId.slice(ITEM_PREFIX.length);
      return openItemConfigModal(interaction, storeKey);
    }

    const VIEW_PREFIX = `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.VIEW_ROLES}:`;
    if (customId.startsWith(VIEW_PREFIX)) {
      const storeKey = customId.slice(VIEW_PREFIX.length);
      return openViewRolesSelect(interaction, storeKey);
    }

    const REQ_ROLE_PREFIX = `${KEIHI_IDS.PREFIX.BUTTON}:${KEIHI_IDS.ACTION.REQUEST_ROLES}:`;
    if (customId.startsWith(REQ_ROLE_PREFIX)) {
      const storeKey = customId.slice(REQ_ROLE_PREFIX.length);
      return openRequestRolesSelect(interaction, storeKey);
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

  // �Z���N�g���j���[
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

  // ���[�_��
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
