// src/utils/config/configPanel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

module.exports = async function buildConfigPanel(guildId) {
  const config = await loadStoreRoleConfig(guildId) || {};

  const stores = Array.isArray(config.stores) ? config.stores : [];
  const positions = Array.isArray(config.roles) ? config.roles : []; // 'positions' から 'roles' に変更
  const srm = config.links?.store_role || {};
  const prm = config.links?.role_role || {};
  const gl = config.globalLogChannel ? `<#${config.globalLogChannel}>` : '`未設定`';
  const al = config.adminLogChannel ? `<#${config.adminLogChannel}>` : '`未設定`';
  const clt = config.commandLogThread ? `<#${config.commandLogThread}>` : '`未設定`';
  const slt = config.settingLogThread ? `<#${config.settingLogThread}>` : '`未設定`';
  const slackUrl = (config.slackWebhookUrl || (config.slack && config.slack.url)) || null;

  const storesText = stores.length ? stores.map(s => `・${s}`).join('\n') : '`未登録`';
  const positionsText = positions.length ? positions.map(p => `・${p}`).join('\n') : '`未登録`';
  const srmText = Object.keys(srm).length
    ? Object.entries(srm).map(([store, roles]) => `・${store}: ${roles.map(r => `<@&${r}>`).join(', ')}`).join('\n')
    : '`未登録`';
  const prmText = Object.keys(prm).length
    ? Object.entries(prm).map(([pos, roles]) => `・${pos}: ${roles.map(r => `<@&${r}>`).join(', ')}`).join('\n')
    : '`未登録`';
  const slackText = slackUrl ? slackUrl : '`未設定`';

  const embed = new EmbedBuilder()
    .setTitle('設定パネル')
    .setDescription([
      '🏪 登録済み店舗一覧',
      storesText,
      '',
      '👥 登録済み役職一覧',
      positionsText,
      '',
      '店舗とロールの紐づけ一覧',
      srmText,
      '',
      '役職とロールの紐づけ一覧',
      prmText,
      '',
      'グローバルログチャンネル',
      gl,
      '',
      '管理ログチャンネル',
      al,
      '',
      'コマンドログスレッド',
      clt,
      '',
      '設定ログスレッド',
      slt,
      '',
      'Slack通知自動化',
      slackText,
    ].join('\n'))
    .setColor(0x00AE86)
    .setFooter({ text: 'SVML 管理BOT' });

  // ボタン群
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_store_edit').setLabel('店舗名編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config_role_edit').setLabel('役職編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config_store_role_link').setLabel('店舗とロールの紐づけ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_position_role_link').setLabel('役職とロールの紐づけ').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_user_register').setLabel('ユーザー情報登録').setStyle(ButtonStyle.Success),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_global_log').setLabel('グローバルログ設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_admin_log').setLabel('管理ログ設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_command_thread').setLabel('コマンドログスレッド設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_setting_thread').setLabel('設定ログスレッド設定').setStyle(ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_slack_auto').setLabel('Slack通知自動化').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2, row3, row4] };
};
