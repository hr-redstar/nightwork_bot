/**
 * src/handlers/KPI/kpiPanel.js
 * メインのKPI設定パネルの描画・更新
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getKpiConfig } = require('../../utils/KPI/kpiDataManager');

/**
 * KPI設定パネルを投稿または更新する
 * @param {import('discord.js').TextChannel} channel
 */
async function postKpiPanel(channel) {
  const guildId = channel.guild.id;
  const config = await getKpiConfig(guildId);

  // 設置済み店舗リストの整形
  const installedPanels = config.installedPanels || {};
  const storeListText = Object.keys(installedPanels).length
    ? Object.entries(installedPanels)
        .map(([store, info]) => `・${store}：<#${info.channelId}>`)
        .join('\n')
    : '（未設置）';

  // 承認役職リストの整形
  const approvalRoles = config.approvalRoles || [];
  const roleListText = approvalRoles.length
    ? approvalRoles.map(roleId => `<@&${roleId}>`).join(', ')
    : '未設定';

  const embed = new EmbedBuilder()
    .setTitle('💹 KPI設定パネル')
    .setDescription('KPI設定・申請・目標値登録を管理します。')
    .setColor(0x0099ff)
    .addFields(
      { name: '🏢 設置店舗', value: storeListText, inline: false },
      { name: '🛡️ KPI承認役職', value: roleListText, inline: false },
      { name: '🕒 更新日時', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
    )
    .setFooter({ text: 'KPI設定' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kpi_setup_store')
      .setLabel('🏢 KPI設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('kpi_role_setup')
      .setLabel('🛡️ KPI承認役職')
      .setStyle(ButtonStyle.Secondary)
  );

  // 既存のパネルを探して更新、なければ新規投稿
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existingPanel = messages?.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title === '💹 KPI設定パネル');

  if (existingPanel) {
    await existingPanel.edit({ embeds: [embed], components: [row] });
  } else {
    await channel.send({ embeds: [embed], components: [row] });
  }
}

module.exports = { postKpiPanel };