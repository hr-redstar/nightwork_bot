// src/handlers/keihi/request/index.js
// ----------------------------------------------------
// 経費「申請パネル」側のインタラクション集約
//   - ボタン（経費項目登録 / 閲覧役職 / 申請役職 / 経費申請）
//   - セレクト（閲覧役職 / 申請役職）
//   - モーダル（経費項目登録）
// ----------------------------------------------------

const { InteractionType } = require('discord.js');

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

const {
  REQUEST_ITEM_SELECT_PREFIX,
  REQUEST_MODAL_PREFIX,
  handleRequestStart,
  handleRequestItemSelect,
  handleRequestModalSubmit,
} = require('./requestFlow');
const { handleApproveButton, handleModifyButton, handleDeleteButton, handleModifyModalSubmit, APPROVE_PREFIX, MODIFY_PREFIX, DELETE_PREFIX, MODIFY_MODAL_PREFIX } = require('./statusActions');

/**
 * 経費申請まわりのインタラクションをまとめて処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiRequestInteraction(interaction) {
  const { customId } = interaction;
  if (!customId) return;

  // ---------------- ボタン ----------------
  if (interaction.isButton()) {
    // keihi_request:btn:{action}:{storeId}
    if (customId.startsWith('keihi_request:btn:')) {
      const parts = customId.split(':');
      const [prefix, kind, action, storeId] = parts;

      if (prefix !== 'keihi_request' || kind !== 'btn') return;

      switch (action) {
        case 'item_config':
          // 経費項目登録
          return openItemConfigModal(interaction, storeId);

        case 'view_roles':
          // スレッド閲覧役職設定
          return openViewRolesSelect(interaction, storeId);

        case 'request_roles':
          // 申請役職設定
          return openRequestRolesSelect(interaction, storeId);

        case 'request':
          // 経費申請フロー本体
          return handleRequestStart(interaction, storeId);

        default:
          return;
      }
    }

    // ② ステータス操作ボタン（承認 / 修正 / 削除）
    if (customId.startsWith(`${APPROVE_PREFIX}::`)) {
      return handleApproveButton(interaction);
    }
    if (customId.startsWith(`${MODIFY_PREFIX}::`)) {
      return handleModifyButton(interaction);
    }
    if (customId.startsWith(`${DELETE_PREFIX}::`)) {
      return handleDeleteButton(interaction);
    }

    return;
  }

  // ---------------- セレクトメニュー ----------------
  if (interaction.isStringSelectMenu()) {
    // 閲覧役職
    if (customId.startsWith(`${KEIHI_IDS.PREFIX.VIEW_ROLE_SELECT}:`)) {
      return handleViewRoleSelect(interaction);
    }

    // 申請役職
    if (customId.startsWith(`${KEIHI_IDS.PREFIX.REQUEST_ROLE_SELECT}:`)) {
      return handleRequestRoleSelect(interaction);
    }

    // 経費項目（申請フロー）
    if (customId.startsWith(`${REQUEST_ITEM_SELECT_PREFIX}:`)) {
      return handleRequestItemSelect(interaction);
    }
    return;
  }

  // ---------------- モーダル ----------------
  if (interaction.type === InteractionType.ModalSubmit) {
    // 経費項目登録モーダル
    if (customId.startsWith(`keihi_request:modal_item_config::`)) {
      return handleItemConfigModalSubmit(interaction);
    }

    // 経費申請モーダル
    if (customId.startsWith(`keihi_request_request_modal::`)) {
      return handleRequestModalSubmit(interaction);
    }

    // 修正モーダル
    if (customId.startsWith(`${MODIFY_MODAL_PREFIX}::`)) {
      return handleModifyModalSubmit(interaction);
    }
  }
}

module.exports = {
  handleKeihiRequestInteraction,
};
