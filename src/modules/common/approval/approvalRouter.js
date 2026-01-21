// src/modules/common/approval/approvalRouter.js

const {
  handleApproveAccept,
  handleApproveEdit,
  handleApproveDelete,
} = require('./approvalHandlers');

async function routeApprovalInteraction(interaction, context) {
  const { customId } = interaction;

  if (customId === 'approval:accept') {
    await handleApproveAccept(interaction, context);
    return;
  }

  if (customId === 'approval:edit') {
    await handleApproveEdit(interaction, context);
    return;
  }

  if (customId === 'approval:delete') {
    await handleApproveDelete(interaction, context);
    return;
  }
}

module.exports = {
  routeApprovalInteraction,
};