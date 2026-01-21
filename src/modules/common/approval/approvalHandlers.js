// src/modules/common/approval/approvalHandlers.js

const { MessageFlags } = require('discord.js');

async function handleApproveAccept(interaction, context) {
  await context.onAccept(interaction);

  await interaction.update({
    content: '✅ 承認されました。',
    embeds: [],
    components: [],
  });
}

async function handleApproveEdit(interaction, context) {
  await context.onEdit(interaction);
}

async function handleApproveDelete(interaction, context) {
  await context.onDelete(interaction);

  await interaction.update({
    content: '🗑 削除されました。',
    embeds: [],
    components: [],
  });
}

module.exports = {
  handleApproveAccept,
  handleApproveEdit,
  handleApproveDelete,
};