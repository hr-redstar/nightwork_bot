// modules/kpi/setting/sendKpiSettingPanel.js
// ----------------------------------------------------
// KPI 設定パネル（管理用）表示
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const getBotFooter = require('../../common/utils/embed/getBotFooter');
const getEmbedColor = require('../../common/utils/embed/getEmbedColor');

// ※ 仮：設定取得（後でDB / JSONに差し替え）
const { getKpiConfig } = require('../utils/kpiConfigStore');

async function sendKpiSettingPanel(interaction) {
  try {
    const { guild } = interaction;
    if (!guild) return;

    // --------------------------------------------
    // 設定取得
    // --------------------------------------------
    const config = await getKpiConfig(guild.id);

    const storeName = config?.storeName ?? '未設定';
    const panelChannelId = config?.panelChannelId;
    const approveRoleId = config?.approveRoleId;

    const panelChannelText = panelChannelId
      ? `<#${panelChannelId}>`
      : '未設定';

    const approveRoleText = approveRoleId
      ? `<@&${approveRoleId}>`
      : '未設定';

    // --------------------------------------------
    // Embed
    // --------------------------------------------
    const embed = new EmbedBuilder()
      .setTitle('📊 KPI設定パネル')
      .setDescription('KPIに関する設定を行うパネルです。')
      .addFields(
        {
          name: '設置店舗',
          value: `店舗名：${panelChannelText}`,
          inline: false,
        },
        {
          name: 'KPI承認役職',
          value: `役職名：${approveRoleText}`,
          inline: false,
        }
      )
      .setColor(getEmbedColor('kpi', config)) // Pass guildConfig
      .setFooter(getBotFooter(interaction)) // Pass interaction context
      .setTimestamp();

    // --------------------------------------------
    // Buttons
    // --------------------------------------------
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('kpi:setting:install')
        .setLabel('KPI設置')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('kpi:setting:approveRole')
        .setLabel('KPI承認役職')
        .setStyle(ButtonStyle.Secondary)
    );

    // --------------------------------------------
    // Reply / Update
    // --------------------------------------------
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } else {
      await interaction.reply({
        embeds: [embed],
        components: [row],
      });
    }
  } catch (err) {
    logger.error('[KPI] sendKpiSettingPanel error:', err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ KPI設定パネルの表示に失敗しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = {
  sendKpiSettingPanel,
};