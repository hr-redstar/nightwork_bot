﻿const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { getGuildConfig, saveGuildConfig } = require('../../../utils/config/gcsConfigManager');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { CONFIG_PANEL_SCHEMA } = require('./panelSchema');
const logger = require('../../../utils/logger');

/**
 * 設定パネルを送信・更新
 */
async function sendConfigPanel(channel) {
  const guildId = channel.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const globalConfig = await getGuildConfig(guildId);

  // -------------------------------
  // 1. データ整形
  // -------------------------------
  const stores = storeRoleConfig.stores || [];
  const roles = storeRoleConfig.roles || [];
  const storeRoles = storeRoleConfig.storeRoles || {};
  const positionRoles = storeRoleConfig.positionRoles || {};

  // 店舗一覧
  const storeList = stores.length > 0
    ? '```\n' + stores.join('\n') + '\n```'
    : '未登録';

  // 役職一覧
  const roleList = roles.length > 0
    ? '```\n' + roles.map(r => (typeof r === 'string' ? r : r.name)).join('\n') + '\n```'
    : '未登録';

  // 店舗紐づけ
  let storeRoleList = '未設定';
  if (Object.keys(storeRoles).length > 0) {
    storeRoleList = Object.entries(storeRoles)
      .map(([storeName, roleIds = []]) => {
        const rolesText = roleIds.length > 0 ? roleIds.map(id => `<@&${id}>`).join(' ') : 'なし';
        return `**${storeName}**\n${rolesText}`;
      })
      .join('\n\n');
  }

  // 役職紐づけ
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

  // ログ設定
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

  // その他
  const slackInfo = globalConfig.slackWebhookUrl ? '🔗 設定済み' : '未設定';
  const commandExecutorRole = globalConfig.commandExecutorRoleId ? `<@&${globalConfig.commandExecutorRoleId}>` : '未設定';

  // -------------------------------
  // 2. データマッピング
  // -------------------------------
  const dataMap = {
    stores: storeList,
    roles: roleList,
    storeRoles: storeRoleList,
    positionRoles: positionRoleList,
    logs: logFieldsText,
    slack: slackInfo,
    commandRole: commandExecutorRole,
  };

  // -------------------------------
  // 3. パネル構築 (Schema利用)
  // -------------------------------
  const embedFields = CONFIG_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback,
  }));

  const panel = buildPanel({
    title: CONFIG_PANEL_SCHEMA.title,
    description: CONFIG_PANEL_SCHEMA.description,
    color: CONFIG_PANEL_SCHEMA.color,
    fields: embedFields,
    buttons: CONFIG_PANEL_SCHEMA.buttons,
  });

  // -------------------------------
  // 4. パネル送信 / 更新
  // -------------------------------
  let existingPanel = null;
  if (globalConfig.configPanelMessageId) {
    existingPanel = await channel.messages.fetch(globalConfig.configPanelMessageId).catch(() => null);
    if (existingPanel && (existingPanel.author.id !== channel.client.user.id || existingPanel.embeds[0]?.title !== CONFIG_PANEL_SCHEMA.title)) {
      existingPanel = null;
    }
  }

  if (!existingPanel) {
    const messages = await channel.messages.fetch({ limit: 50 });
    existingPanel = messages.find(m => m.author.id === channel.client.user.id && m.embeds[0]?.title === CONFIG_PANEL_SCHEMA.title);
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
