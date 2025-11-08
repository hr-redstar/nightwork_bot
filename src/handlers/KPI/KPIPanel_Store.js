/**
 * src/handlers/KPI/KPIPanel_Store.js
 */
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

async function postOrUpdateKpiStorePanel(channel, storeName) {
  const guildId = channel.guild.id;
  const config = await getGuildConfig(guildId);
  const storeData = config?.KPI?.[storeName] || {};

  const embed = new EmbedBuilder()
    .setTitle(`🏬 KPI設定｜${storeName}`)
    .setDescription(
      `KPIログ: ${
        storeData.channelLink || '未設定'
      }\nKPI承認役職: ${
        storeData.approveRoleName || '未設定'
      }`
    )
    .setColor(0x00bcd4)
    .setFooter({ text: 'ナイトワーク向け 業務改善bot | KPI設定' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`kpi_target_${storeName}`)
      .setLabel('🎯 KPI目標登録')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`kpi_report_${storeName}`)
      .setLabel('📝 KPI申請')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`kpi_summary_${storeName}`)
      .setLabel('📈 KPI月次集計')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row1] });
}

module.exports = { postOrUpdateKpiStorePanel };
