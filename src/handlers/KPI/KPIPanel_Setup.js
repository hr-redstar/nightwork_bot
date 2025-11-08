/**
 * src/handlers/KPI/KPIPanel_Setup.js
 * KPI設定パネル（全体設定パネル）を生成・更新
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * KPI設定パネルを生成して返す
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{embeds: EmbedBuilder[], components: ActionRowBuilder[]}>}
 */
async function buildKpiConfigPanel(guild) {
  const guildId = guild.id;
  const config = await getGuildConfig(guildId);
  const kpiConfig = config?.KPI || {};
  const kpiStores = Object.keys(kpiConfig).filter(k => k !== 'global');

  let desc = '';
  if (kpiStores.length === 0) {
    desc = 'まだKPI設置店舗はありません。';
  } else {
    desc = kpiStores.map(storeName => {
      const data = kpiConfig[storeName];
      const link = data.channelLink || '未設定';
      const role = data.approveRole ? `<@&${data.approveRole}>` : (data.approveRoleName || '未設定');
      return `🏪 **${storeName}**：${link}\n👑 承認役職：${role}`;
    }).join('\n\n');
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 KPI設定パネル')
    .setDescription(desc)
    .setColor(0x2ecc71)
    .setFooter({ text: 'ナイトワーク向け 業務改善bot | KPI設定' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kpi_setup_store')
      .setLabel('🏪 KPI設置')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('kpi_setup_approve_role')
      .setLabel('👑 KPI承認役職')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

async function postOrUpdateKpiConfigPanel(channel, interaction) {
  const panel = await buildKpiConfigPanel(channel.guild);
  // Implement finding and updating an existing message, or sending a new one.
  // For now, we'll just send a new one as a placeholder.
  await channel.send(panel);
}

module.exports = { buildKpiConfigPanel, postOrUpdateKpiConfigPanel };
