// src/handlers/uriage/uriageHandler.js
// 承認・修正などのボタン/モーダルの最低限ハンドラ

const { logApproval, logEdit } = require('./uriageLogger');

async function handleApprove(interaction) {
  // 仕様未確定のため最低限の応答とログのみ
  await interaction.reply({ content: '承認処理は未実装です。', ephemeral: true });
  await logApproval(interaction, { ok: false });
  return true;
}

async function handleButton(interaction) {
  const { customId } = interaction;
  if (customId.startsWith('sales_approve')) return handleApprove(interaction);
  if (customId.startsWith('sales_edit')) {
    await interaction.reply({ content: '修正処理は未実装です。', ephemeral: true });
    await logEdit(interaction, { ok: false });
    return true;
  }
  return false;
}

async function handleModalSubmit(interaction) {
  if (!interaction.customId.startsWith('sales_edit_modal')) return false;
  await interaction.reply({ content: '修正モーダル処理は未実装です。', ephemeral: true });
  await logEdit(interaction, { ok: false, modal: true });
  return true;
}

module.exports = { handleApprove, handleButton, handleModalSubmit };

