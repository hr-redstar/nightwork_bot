// src/handlers/KPI/KPIPanel_Report.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');

async function createKpiReportPanel(interaction, storeName, channelId) {
  const ch = interaction.guild.channels.cache.get(channelId);
  if (!ch) return interaction.reply({ content: '⚠️ チャンネルが見つかりません。', flags: MessageFlags.Ephemeral });

  const cfg = (await getGuildConfig(interaction.guild.id)) || {};
  const kpiSetting = cfg.kpiTargets?.[storeName] || {
    sales: '未設定',
    costRate: '未設定',
    avgPrice: '未設定',
    visitors: '未設定',
  };

  const embed = new EmbedBuilder()
    .setTitle(`📈 ${storeName}｜KPI報告パネル`)
    .setDescription('日次のKPI報告・承認・確認を行うためのパネルです。')
    .addFields(
      { name: '💰 目標売上', value: String(kpiSetting.sales), inline: true },
      { name: '💹 人件費率目標', value: String(kpiSetting.costRate), inline: true },
      { name: '🍸 客単価目標', value: String(kpiSetting.avgPrice), inline: true },
      { name: '👥 来客数目標', value: String(kpiSetting.visitors), inline: true },
    )
    .setColor(0x2ecc71)
    .setFooter({ text: 'KPI報告管理パネル' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`kpi_report_${storeName}`).setLabel('📊 KPI報告').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`kpi_edit_${storeName}`).setLabel('⚙️ KPI設定編集').setStyle(ButtonStyle.Secondary),
  );

  await ch.send({ embeds: [embed], components: [row] });

  if (!cfg.kpiChannels) cfg.kpiChannels = {};
  cfg.kpiChannels[storeName] = channelId;
  await setGuildConfig(interaction.guild.id, cfg);

  await interaction.reply({
    content: `✅ **${storeName}** のKPI報告パネルを <#${channelId}> に設置しました。`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = { createKpiReportPanel };
