// modules/kpi/approve/approveHandlers.js
// ----------------------------------------------------
// KPI 承認 / 却下 処理
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');
const kpiConfigStore = require('../store/kpiConfigStore');
const { updateKpiPanel } = require('../modal/modalHandlers');
const { buildAdminLogEmbed } = require('../../common/adminLog/buildAdminLogEmbed');
const { sendAdminLog } = require('../../common/adminLog/sendAdminLog');

async function handleApproveAccept(interaction) {
  try {
    if (!hasApproveRole(interaction)) {
      return interaction.reply({
        content: '❌ KPI承認権限がありません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    await kpiConfigStore.setApproved(interaction.guild.id, true);

    await interaction.update({
      content: '✅ KPI申請は承認されました。',
      embeds: [],
      components: [],
    });

    await updateKpiPanel({
      guild: interaction.guild,
      channel: interaction.channel,
      approved: true,
    });

    // 管理者ログ送信
    await sendAdminLog({
      guild: interaction.guild,
      embed: buildAdminLogEmbed({
        functionName: 'KPI',
        action: 'approve',
        storeName: '店舗A', // TODO: Get from context
        targetDate: '2026-01-01', // TODO: Get from context
        threadUrl: interaction.message.url,
        executor: interaction.user,
        channel: interaction.channel,
      }),
    });
  } catch (err) {
    logger.error('[KPI] handleApproveAccept error:', err);
  }
}

async function handleApproveReject(interaction) {
  try {
    if (!hasApproveRole(interaction)) {
      return interaction.reply({
        content: '❌ KPI承認権限がありません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    await kpiConfigStore.setApproved(interaction.guild.id, false);

    await interaction.update({
      content: '❌ KPI申請は却下されました。',
      embeds: [],
      components: [],
    });

    // 却下の場合もログは残す
    await sendAdminLog({
      guild: interaction.guild,
      embed: buildAdminLogEmbed({
        functionName: 'KPI',
        action: 'delete', // 'reject' アクションを constants に追加するか、'delete' で代用
        storeName: '店舗A', // TODO: Get from context
        targetDate: '2026-01-01', // TODO: Get from context
        threadUrl: interaction.message.url,
        executor: interaction.user,
        channel: interaction.channel,
        note: '申請が却下されました。',
      }),
    });
  } catch (err) {
    logger.error('[KPI] handleApproveReject error:', err);
  }
}

function hasApproveRole(interaction) {
  const config = kpiConfigStore.getSync(interaction.guild.id);
  return interaction.member.roles.cache.has(config.approveRoleId);
}

module.exports = {
  handleApproveAccept,
  handleApproveReject,
};