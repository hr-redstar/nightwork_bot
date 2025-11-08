/**
 * src/handlers/KPI/KPIMonthlyReport.js
 */
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

function calcProgress(target, reports) {
  const total = (key) => reports.reduce((sum, r) => sum + (r[key] || 0), 0);
  return {
    visitors: total('visitors'),
    shimei: total('shimei'),
    totalSales: total('totalSales'),
    shimeiSales: total('shimeiSales'),
    freeSales: total('freeSales'),
  };
}

function createSummaryEmbed(storeName, target, reports) {
  const { visitors, shimei, totalSales, shimeiSales, freeSales } = calcProgress(target, reports);

  const vRate = ((visitors / target.visitors) * 100).toFixed(1);
  const sRate = ((shimei / target.shimei) * 100).toFixed(1);
  const tRate = ((totalSales / target.totalSales) * 100).toFixed(1);

  const start = new Date(target.start);
  const end = new Date(target.end);
  const now = new Date();
  const totalDays = Math.ceil((end - start) / 86400000);
  const elapsedDays = Math.min(totalDays, Math.ceil((now - start) / 86400000));
  const progressDays = ((elapsedDays / totalDays) * 100).toFixed(1);

  const mark = (rate) => (rate >= progressDays ? '✅' : '⚠️');

  return new EmbedBuilder()
    .setTitle(`📈 ${storeName}｜KPI月次進捗レポート`)
    .setDescription(`📅 ${target.start} ～ ${target.end}\n📊 日数進捗: ${elapsedDays}/${totalDays}日 (${progressDays}%)`)
    .addFields(
      { name: '👥 来客数', value: `${visitors}/${target.visitors}人 (${vRate}%) ${mark(vRate)}`, inline: true },
      { name: '⭐ 指名本数', value: `${shimei}/${target.shimei}本 (${sRate}%) ${mark(sRate)}`, inline: true },
      { name: '💰 指名売上', value: `${shimeiSales.toLocaleString()}円`, inline: true },
      { name: '💵 フリー売上', value: `${freeSales.toLocaleString()}円`, inline: true },
      { name: '🏆 総売上', value: `${totalSales.toLocaleString()}円 / ${target.totalSales.toLocaleString()}円 (${tRate}%) ${mark(tRate)}`, inline: false }
    )
    .setColor(0x3498db)
    .setFooter({ text: 'ナイトワーク向け 業務改善bot | KPI集計' });
}

async function handleMonthlySummary(interaction) {
  const storeName = interaction.customId.replace('kpi_summary_', '');
  const guildId = interaction.guild.id;

  const config = await getGuildConfig(guildId);
  const store = config?.KPI?.[storeName];
  if (!store || !store.target) {
    await interaction.reply({
      content: `⚠️ 店舗「${storeName}」のKPI目標が見つかりません。`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = createSummaryEmbed(storeName, store.target, store.reports || []);
  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { handleMonthlySummary };
