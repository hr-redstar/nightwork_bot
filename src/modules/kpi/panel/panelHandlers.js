// src/modules/kpi/panel/panelHandlers.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBotFooter } = require('../../common/utils/embed/getBotFooter');
const { getEmbedColor } = require('../../common/utils/embed/getEmbedColor');

async function handleSendKpiPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📊 KPIパネル')
    .setDescription('KPIの申請・確認を行います。')
    .setColor(getEmbedColor('kpi'))
    .setFooter(getBotFooter(interaction))
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kpi:apply:start')
      .setLabel('KPI申請')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}

module.exports = {
  handleSendKpiPanel,
};