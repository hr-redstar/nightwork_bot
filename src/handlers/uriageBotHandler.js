﻿﻿﻿/**
 * src/handlers/uriageBotHandler.js
 * v14 (discord.js) での interactionCreate 用ルーティングハンドラ
 * 役割：売上設定パネル・売上報告パネルに関する各種 interaction を一元的に捌く
 */

const {
  PermissionsBitField,
} = require('discord.js');

// ------- 依存モジュール（実装は別ファイル） --------------------
const {
  handleUriageSettingInteraction,
} = require('./uriage/setting');
const {
  handleUriageReportInteraction,
} = require('./uriage/report');
const {
  handleUriageReportPanelButton,
  handleUriageStoreSelectForPanel,
  handleUriageChannelSelectForPanel,
} = require('./uriage/setting/requestFlow');
const {
  handleApproverRolesButton,
  handleApproverRolesSelect,
} = require('./uriage/setting/approverRolesFlow');
const {
  handleViewRoleButton,
  handleViewRolesSelect,
  handleRequestRoleButton,
  handleRequestRolesSelect,
} = require('./uriage/report/reportPanelRolesFlow');
const {
  handleSalesReportButton,
  handleSalesReportModal,
  handleSalesApproveButton,
  handleSalesEditButton,
  handleSalesDeleteButton,
} = require('./uriage/report/salesReportFlow');

// ------- ユーティリティ -----------------------------------------
/** 管理者 or 指定権限チェック */
function isAdminOrManageGuild(member) {
  if (!member) return false;
  return member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions?.has(PermissionsBitField.Flags.ManageGuild);
}

// ------- ルーティング本体 ---------------------------------------
/**
 * interactionCreate から呼ばれるメインハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  if (!interaction.customId) return;
  const { customId } = interaction;

  // 設定系のインタラクション (パネル/ロール/CSV発行など)
  if (customId.startsWith('uriage:setting')) {
    return handleUriageSettingInteraction(interaction);
  }
  // 報告系のインタラクション (報告/承認/修正/削除など)
  if (customId.startsWith('uriage:report')) {
    return handleUriageReportInteraction(interaction);
  }

  if (interaction.isButton()) {
    if (customId === 'uriage_setting_report_panel') {
      return handleUriageReportPanelButton(interaction);
    }
    if (customId === 'uriage_setting_approver_roles') {
      return handleApproverRolesButton(interaction);
    }

    if (customId.startsWith('URIAGE_VIEW_ROLE__')) {
      return handleViewRoleButton(interaction);
    }
    if (customId.startsWith('URIAGE_REQUEST_ROLE__')) {
      return handleRequestRoleButton(interaction);
    }
    if (customId.startsWith('URIAGE_SALES_REPORT__')) {
      return handleSalesReportButton(interaction);
    }
    if (customId.startsWith('URIAGE_SALES_APPROVE__')) {
      return handleSalesApproveButton(interaction);
    }
    if (customId.startsWith('URIAGE_SALES_EDIT__')) {
      return handleSalesEditButton(interaction);
    }
    if (customId.startsWith('URIAGE_SALES_DELETE__')) {
      return handleSalesDeleteButton(interaction);
    }
  }

  if (interaction.isAnySelectMenu()) {
    if (customId === 'URIAGE_SELECT_STORE_FOR_REPORT_PANEL') {
      return handleUriageStoreSelectForPanel(interaction);
    }
    if (customId.startsWith('URIAGE_SELECT_CHANNEL_FOR_REPORT_PANEL__')) {
      return handleUriageChannelSelectForPanel(interaction);
    }

    if (customId === 'URIAGE_SELECT_APPROVER_ROLES') {
      return handleApproverRolesSelect(interaction);
    }
    if (customId.startsWith('URIAGE_SELECT_VIEW_ROLES__')) {
      return handleViewRolesSelect(interaction);
    }
    if (customId.startsWith('URIAGE_SELECT_REQUEST_ROLES__')) {
      return handleRequestRolesSelect(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (customId.startsWith('URIAGE_SALES_REPORT_MODAL__')) {
      return handleSalesReportModal(interaction);
    }
  }
}

/**
 * The actual request is below:
 * // src/handlers/uriage/uriageBotHandler.js
 * // v14 (discord.js) での interactionCreate 用ルーティングハンドラ
 * // 役割：売上設定パネル・売上報告パネルに関する各種 interaction を一元的に捌く
 */
module.exports = {
  handleUriageInteraction,
  isAdminOrManageGuild,
};