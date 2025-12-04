// src/utils/feature/featureSettingPanelTemplate.js
// ----------------------------------------------------
// 汎用: 機能名設定パネル Embed + Button
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const dayjs = require('dayjs');
const { loadStoreRoleConfig } = require('../config/storeRoleConfigManager');
const { getGuildConfig } = require('../config/gcsConfigManager');
const { createFeatureIds } = require('./featureIdsTemplate');

/**
 * 設定パネルを作る共通関数
 * @param {object} params
 * @param {import('discord.js').Guild} params.guild
 * @param {string} params.featureKey     例: 'keihi'
 * @param {string} params.featureLabel   例: '経費'
 * @param {Function} params.loadFeatureConfig
 * @returns {Promise<{embeds: EmbedBuilder[], components: ActionRowBuilder[]}>}
 */
async function buildFeatureSettingPanel({
  guild,
  featureKey,
  featureLabel,
  loadFeatureConfig,
}) {
  const guildId = guild.id;
  const IDS = createFeatureIds(featureKey, featureLabel);

  const [config, storeRoleConfig, globalConfig] = await Promise.all([
    loadFeatureConfig(guildId),
    loadStoreRoleConfig(guildId),
    getGuildConfig(guildId),
  ]);

  // 店舗一覧表示
  const panelLines = [];
  if (config.panels && Object.keys(config.panels).length > 0) {
    for (const [store, info] of Object.entries(config.panels)) {
      const ch = info.channelId ? `<#${info.channelId}>` : '未設定';
      const link = info.messageUrl || 'リンクなし';
      panelLines.push(`・${store}：${ch}（${link}）`);
    }
  } else {
    panelLines.push('未登録');
  }

  // 役職一覧
  const rolesText = (roleIds) =>
    !roleIds || roleIds.length === 0
      ? '未設定'
      : roleIds.map((id) => `<@&${id}>`).join(' / ');

  const embed = new EmbedBuilder()
    .setTitle(`⚙️ ${featureLabel}設定パネル`)
    .setDescription(
      [
        `🏪 **${featureLabel}パネル設置一覧**`,
        panelLines.join('\n'),
        '',
        `✅ **承認役職**\n${rolesText(config.roles?.approver)}`,
        `👀 **閲覧役職**\n${rolesText(config.roles?.viewer)}`,
        `✏️ **申請/報告役職**\n${rolesText(config.roles?.applicant)}`,
        '',
        `🗂️ CSV出力: YYYY/MM/DD, YYYY/MM, 年, 四半期 別にエクスポート可能`,
      ].join('\n'),
    )
    .setFooter({ text: `更新: ${config.updatedAt || '未更新'}` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONFIG_PANEL_SETUP())
      .setLabel(`${featureLabel}パネル設置`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONFIG_ROLE_APPROVER())
      .setLabel('承認役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONFIG_ROLE_VIEWER())
      .setLabel('閲覧役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONFIG_ROLE_APPLICANT())
      .setLabel('申請/報告役職')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONFIG_CSV_EXPORT())
      .setLabel(`${featureLabel}CSV発行`)
      .setStyle(ButtonStyle.Success),
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

module.exports = { buildFeatureSettingPanel };
