const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendKpiLogToThread } = require('./KPIThreadLogger');
const { postOrUpdateKpiStorePanel } = require('./KPIPanel_Store');

async function handleReportModalOpen(interaction) {
  const storeName = interaction.customId.replace('kpi_report_', '');
  const modal = new ModalBuilder()
    .setCustomId(`kpi_report_modal_${storeName}`)
    .setTitle(`📝 KPI申請｜${storeName}`);

  const fields = [
    { id: 'reportDate', label: '日付 (YYYY-MM-DD)' },
    { id: 'visitors', label: '来客数' },
    { id: 'shimei', label: '指名本数' },
    { id: 'shimeiSales', label: '指名売上 (円)' },
    { id: 'freeSales', label: 'フリー売上 (円)' },
  ];

  modal.addComponents(fields.map(f =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setStyle(TextInputStyle.Short)
    )
  ));

  await interaction.showModal(modal);
}

async function handleReportModalSubmit(interaction) {
  const storeName = interaction.customId.replace('kpi_report_modal_', '');
  const guildId = interaction.guild.id;

  const report = {
    date: interaction.fields.getTextInputValue('reportDate'),
    visitors: parseInt(interaction.fields.getTextInputValue('visitors'), 10),
    shimei: parseFloat(interaction.fields.getTextInputValue('shimei')),
    shimeiSales: parseInt(interaction.fields.getTextInputValue('shimeiSales'), 10),
    freeSales: parseInt(interaction.fields.getTextInputValue('freeSales'), 10),
  };
  report.totalSales = report.shimeiSales + report.freeSales;

  const config = (await getGuildConfig(guildId)) || {};
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};
  if (!config.KPI[storeName].reports) config.KPI[storeName].reports = [];

  config.KPI[storeName].reports.push(report);
  await setGuildConfig(guildId, config);

  await postOrUpdateKpiStorePanel(interaction.channel, storeName);

  const embed = new EmbedBuilder()
    .setTitle(`📝 KPI申請登録完了｜${storeName}`)
    .setDescription(
      `📅 ${report.date}\n👥 来客数: ${report.visitors}\n⭐ 指名本数: ${report.shimei}\n💰 総売上: ${report.totalSales.toLocaleString()}円`
    )
    .setColor(0x1abc9c);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, });
  await sendKpiLogToThread(interaction.channel, 'report', storeName, interaction.user.username, embed);
}

module.exports = { handleReportModalOpen, handleReportModalSubmit };
