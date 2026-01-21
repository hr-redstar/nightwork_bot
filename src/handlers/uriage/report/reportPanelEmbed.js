// src/handlers/uriage/report/reportPanelEmbed.js
const { EmbedBuilder } = require('discord.js');

function mentionRoles(roleIds = []) {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return '未設定';
  return roleIds.map((id) => `<@&${id}>`).join('\n');
}

function buildUriageReportPanelEmbed(storeName, storeCfg = {}) {
  const viewerRoleIds =
    storeCfg?.viewerRoleIds ?? storeCfg?.viewRoleIds ?? storeCfg?.viewRoles ?? [];
  const reporterRoleIds =
    storeCfg?.reporterRoleIds ?? storeCfg?.requestRoleIds ?? storeCfg?.reportRoles ?? [];

  return new EmbedBuilder()
    .setTitle(`売上報告パネル - ${storeName}`)
    .setDescription('日付　総売り　現金　カード,売掛　 諸経費')
    .addFields(
      { name: '閲覧役職', value: mentionRoles(viewerRoleIds), inline: true },
      { name: '申請役職', value: mentionRoles(reporterRoleIds), inline: true },
    );
}

module.exports = { buildUriageReportPanelEmbed };