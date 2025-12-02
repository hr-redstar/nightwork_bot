// src/handlers/keihi/request/index.js
// ----------------------------------------------------
// 経費「申請パネル」側のインタラクション集約
//   - ボタン（経費項目登録 / 閲覧役職 / 申請役職 / 経費申請）
//   - セレクト（閲覧役職 / 申請役職 / 経費項目選択）
//   - モーダル（経費項目登録 / 経費申請 / 修正）
// ----------------------------------------------------

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

const { IDS: REQ_IDS } = require('./requestIds');
const { STATUS_IDS } = require('./statusIds');

const { handleRequestStart, handleRequestItemSelect } = require('./requestStart');
const { handleRequestModalSubmit } = require('./requestModal');
const {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModalSubmit,
} = require('./statusActions');

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
    if (customId.startsWith(`${STATUS_IDS.APPROVE}::`)) {
      return handleApproveButton(interaction);
    }
    if (customId.startsWith(`${STATUS_IDS.MODIFY}::`)) {
      return handleModifyButton(interaction);
    }
    if (customId.startsWith(`${STATUS_IDS.DELETE}::`)) {
      return handleDeleteButton(interaction);
    }

    return;
  }

  // ---------------- セレクトメニュー ----------------
  if (interaction.isStringSelectMenu()) {
    // 閲覧役職
    if (customId.startsWith('keihi_request:sel_view_roles:')) {
      return handleViewRoleSelect(interaction);
    }

    // 申請役職
    if (customId.startsWith('keihi_request:sel_req_roles:')) {
      return handleRequestRoleSelect(interaction);
    }

    // 経費項目（申請フロー）
    if (customId.startsWith(`${REQ_IDS.REQUEST_ITEM_SELECT}:`)) {
      return handleRequestItemSelect(interaction);
    }
    return;
  }

  // ---------------- モーダル ----------------
  if (interaction.isModalSubmit()) {
    // 経費項目登録モーダル
    if (customId.startsWith('keihi_request:modal_item_config::')) {
      return handleItemConfigModalSubmit(interaction);
    }

    const modalPrefix =
      (REQ_IDS && REQ_IDS.REQUEST_MODAL) || 'keihi_request_request_modal';

    // 経費申請モーダル
    if (customId.startsWith(`${modalPrefix}::`)) {
      return handleRequestModalSubmit(interaction);
    }

    // 修正モーダル
    if (customId.startsWith(`${STATUS_IDS.MODIFY_MODAL}::`)) {
      return handleModifyModalSubmit(interaction);
    }
  }
}

module.exports = {
  handleKeihiRequestInteraction,
};
