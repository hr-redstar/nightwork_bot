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

async function handleTargetModalOpen(interaction) {
  const storeName = interaction.customId.replace('kpi_target_', '');
  const modal = new ModalBuilder()
    .setCustomId(`kpi_target_modal_${storeName}`)
    .setTitle(`🎯 KPI目標登録｜${storeName}`);

  const inputs = [
    { id: 'start', label: '開始日 (YYYY-MM-DD)', style: TextInputStyle.Short },
    { id: 'end', label: '終了日 (YYYY-MM-DD)', style: TextInputStyle.Short },
    { id: 'visitors', label: '来客数 目標', style: TextInputStyle.Short },
    { id: 'shimei', label: '指名本数 目標', style: TextInputStyle.Short },
    { id: 'totalSales', label: '総売上目標 (円)', style: TextInputStyle.Short },
  ];

  modal.addComponents(inputs.map(i => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(i.id).setLabel(i.label).setStyle(i.style)
  )));

  await interaction.showModal(modal);
}

async function handleTargetModalSubmit(interaction) {
  const storeName = interaction.customId.replace('kpi_target_modal_', '');
  const guildId = interaction.guild.id;

  const target = {
    start: interaction.fields.getTextInputValue('start'),
    end: interaction.fields.getTextInputValue('end'),
    visitors: parseInt(interaction.fields.getTextInputValue('visitors'), 10),
    shimei: parseFloat(interaction.fields.getTextInputValue('shimei')),
    totalSales: parseInt(interaction.fields.getTextInputValue('totalSales'), 10),
  };

  const config = await getGuildConfig(guildId);
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};
  config.KPI[storeName].target = target;

  await setGuildConfig(guildId, config);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 KPI目標設定｜${storeName}`)
    .setDescription(
      `📅 ${target.start} ～ ${target.end}\n👥 来客数: ${target.visitors}\n⭐ 指名本数: ${target.shimei}\n💰 総売上: ${target.totalSales.toLocaleString()}円`
    )
    .setColor(0x2ecc71);

  await postOrUpdateKpiStorePanel(interaction.channel, storeName);
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, });

  await sendKpiLogToThread(interaction.channel, 'target', storeName, interaction.user.username, embed);
}

module.exports = { handleTargetModalOpen, handleTargetModalSubmit };
