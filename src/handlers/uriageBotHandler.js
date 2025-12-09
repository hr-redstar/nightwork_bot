/**
 * src/handlers/uriageBotHandler.js
 * v14 (discord.js) 用 interactionCreate ルーター
 * 役割: 売上設定パネル・売上報告パネルまわりのインタラクションを集約
 */

const { PermissionsBitField } = require('discord.js');
const { handleUriageSettingInteraction } = require('./uriage/setting');
const { handleUriageReportInteraction } = require('./uriage/report');

/** 管理者 or ManageGuild 判定 */
function isAdminOrManageGuild(member) {
  if (!member) return false;
  return (
    member.permissions?.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions?.has(PermissionsBitField.Flags.ManageGuild)
  );
}

/**
 * interactionCreate から呼ばれるメインハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageInteraction(interaction) {
  if (!interaction.customId) return;
  const { customId } = interaction;

  // 設定系: uriage_config / uriage:setting プレフィクス
  if (
    customId.startsWith('uriage_config') ||
    customId.startsWith('uriage:setting')
  ) {
    return handleUriageSettingInteraction(interaction);
  }

  // 報告系: uriage:report / uriage_report プレフィクス
  if (customId.startsWith('uriage:report') || customId.startsWith('uriage_report')) {
    return handleUriageReportInteraction(interaction);
  }
}

module.exports = {
  handleUriageInteraction,
  isAdminOrManageGuild,
};
