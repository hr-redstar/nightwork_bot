﻿const { ButtonStyle } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { getGuildConfig, saveGuildConfig } = require('../../../utils/config/gcsConfigManager');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const logger = require('../../../utils/logger');

/**
 * 設定パネルを送信・更新
 */
async function sendConfigPanel(channel) {
  const guildId = channel.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const globalConfig = await getGuildConfig(guildId);

  // -------------------------------
  // フォーマット & Fields 作成
  // -------------------------------
  const stores = storeRoleConfig.stores || [];
  const roles = storeRoleConfig.roles || [];
  const storeRoles = storeRoleConfig.storeRoles || {};
  const positionRoles = storeRoleConfig.positionRoles || {};

  const storeList = stores.length > 0 ? '```\n' + stores.join('\n') + '\n```' : '未登録';
  const roleList = roles.length > 0
    ? '```\n' + roles.map(r => (typeof r === 'string' ? r : r.name)).join('\n') + '\n```'
    : '未登録';

  let storeRoleList = '未設定';
  if (Object.keys(storeRoles).length > 0) {
    storeRoleList = Object.entries(storeRoles)
      .map(([storeName, roleIds = []]) => {
        const rolesText = roleIds.length > 0 ? roleIds.map(id => `<@&${id}>`).join(' ') : 'なし';
        return `**${storeName}**\n${rolesText}`;
      })
      .join('\n\n');
  }

  let positionRoleList = '未設定';
  if (Object.keys(positionRoles).length > 0) {
    positionRoleList = Object.entries(positionRoles)
      .map(([positionId, roleIds = []]) => {
        const positionName = roles.find(r => r.id === positionId)?.name || positionId;
        const rolesText = roleIds.length > 0 ? roleIds.map(id => `<@&${id}>`).join(' ') : 'なし';
        return `**${positionName}**\n${rolesText}`;
      })
      .join('\n\n');
  }

  const logFieldsText = [
    { label: 'グローバルログチャンネル', id: 'globalLogChannel' },
    { label: '管理者ログチャンネル', id: 'adminLogChannel', fallbackId: 'adminLogChannelId' },
    { label: 'コマンドログスレッド', id: 'commandLogThread' },
    { label: '設定ログスレッド', id: 'settingLogThread' },
  ].map(field => {
    let value = globalConfig[field.id];
    if (!value && field.fallbackId) value = globalConfig[field.fallbackId];
    return `**${field.label}**：${value ? `<#${value}>` : '未設定'}`;
  }).join('\n');

  const slackInfo = globalConfig.slackWebhookUrl ? '🔗 設定済み' : '未設定';
  const commandExecutorRole = globalConfig.commandExecutorRoleId ? `<@&${globalConfig.commandExecutorRoleId}>` : '未設定';

  // -------------------------------
  // Panel Construction
  // -------------------------------
  const fields = [
    { name: '🏪 登録済み店舗一覧', value: storeList },
    { name: '👥 登録済み役職一覧', value: roleList },
    { name: '🏢 店舗とロールの紐づけ', value: storeRoleList },
    { name: '👔 役職とロールの紐づけ', value: positionRoleList },
    { name: '📜 ログ設定', value: logFieldsText },
    { name: '🔔 Slack通知自動化', value: slackInfo },
    { name: '⚙️ コマンド実行役職', value: commandExecutorRole },
  ];

  const buttons = [
    [
      { id: 'config:store:edit', label: '店舗名編集', style: ButtonStyle.Primary },
      { id: 'config:role:edit', label: '役職編集', style: ButtonStyle.Primary },
      { id: 'config:store:role:link', label: '店舗とロール紐づけ', style: ButtonStyle.Secondary },
      { id: 'config:position:role:link', label: '役職とロール紐づけ', style: ButtonStyle.Secondary },
    ],
    [
      { id: 'config:user:register', label: 'ユーザー情報登録', style: ButtonStyle.Success },
      { id: 'config:command:role', label: 'コマンド実行役職', style: ButtonStyle.Secondary },
    ],
    [
      { id: 'config:global:log', label: 'グローバルログ', style: ButtonStyle.Secondary },
      { id: 'config:admin:log', label: '管理者ログ', style: ButtonStyle.Secondary },
      { id: 'config:command:thread', label: 'コマンドログ', style: ButtonStyle.Secondary },
      { id: 'config:setting:thread', label: '設定ログ', style: ButtonStyle.Secondary },
    ],
    [
      { id: 'config:slack:auto', label: 'Slack通知', style: ButtonStyle.Primary },
    ],
  ];

  const panel = buildPanel({
    title: '⚙️ 設定パネル',
    description: '', // Desc is optional/empty in original
    fields: fields,
    buttons: buttons
  });
  // Need to set color to match original #3498db
  // buildPanel doesn't accept color in args currently but PanelBuilder class did.
  // User's buildPanel function doesn't support color arg.
  // I'll manually set color on the returned embed if needed, or update buildPanel.
  // For now, I'll access the embed directly.
  panel.embeds[0].setColor('#3498db');

  // -------------------------------
  // パネル更新 or 新規設置
  // -------------------------------
  let existingPanel = null;
  if (globalConfig.configPanelMessageId) {
    existingPanel = await channel.messages.fetch(globalConfig.configPanelMessageId).catch(() => null);
    if (existingPanel && (existingPanel.author.id !== channel.client.user.id || existingPanel.embeds[0]?.title !== '⚙️ 設定パネル')) {
      existingPanel = null;
    }
  }

  if (!existingPanel) {
    const messages = await channel.messages.fetch({ limit: 50 });
    existingPanel = messages.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title === '⚙️ 設定パネル');
  }

  if (existingPanel) {
    await existingPanel.edit(panel);
    logger.info(`[ConfigPanel] 既存パネルを更新しました (ch: ${channel.name})`);
  } else {
    existingPanel = await channel.send(panel);
    logger.info(`[ConfigPanel] 新規設定パネルを設置しました (ch: ${channel.name})`);
  }

  if (existingPanel && existingPanel.id !== globalConfig.configPanelMessageId) {
    await saveGuildConfig(guildId, { configPanelMessageId: existingPanel.id });
  }
}

module.exports = { sendConfigPanel };
