// src/handlers/uriage/report/index.js
// 売上報告まわりの router

const { handleReportButton, handleReportModal } = require('./reportFlow');
const {
  handleViewRolesButton,
  handleViewRolesSelect,
  handleRequestRolesButton,
  handleRequestRolesSelect,
} = require('./reportPanelRolesFlow');
const {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
} = require('./actionStatus');

/**
 * 売上報告ボタン/モーダルのディスパッチ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageReportInteraction(interaction) {
  const customId = interaction.customId || '';

  if (interaction.isButton()) {
    if (customId.startsWith('uriage_report:btn:report:')) {
      return handleReportButton(interaction);
    }
    if (customId.startsWith('uriage_report:btn:view_roles')) {
      return handleViewRolesButton(interaction);
    }
    if (customId.startsWith('uriage_report:btn:request_roles')) {
      return handleRequestRolesButton(interaction);
    }
    if (customId.startsWith('uriage_report_status:approve')) {
      return handleApproveButton(interaction);
    }
    if (customId.startsWith('uriage_report_status:modify')) {
      return handleModifyButton(interaction);
    }
    if (customId.startsWith('uriage_report_status:delete')) {
      return handleDeleteButton(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (customId.startsWith('uriage_report:modal::')) {
      return handleReportModal(interaction);
    }
  }

  if (interaction.isAnySelectMenu()) {
    if (customId.startsWith('uriage_report:sel:view_roles')) {
      return handleViewRolesSelect(interaction);
    }
    if (customId.startsWith('uriage_report:sel:request_roles')) {
      return handleRequestRolesSelect(interaction);
    }
  }
}

module.exports = {
  handleUriageReportInteraction,
};
