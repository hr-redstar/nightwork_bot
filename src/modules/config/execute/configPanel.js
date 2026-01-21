﻿const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { getGuildConfig, saveGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 設定パネルを送信・更新
 */
async function sendConfigPanel(channel) {
  const guildId = channel.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const globalConfig = await getGuildConfig(guildId);

  // -------------------------------
  // フォーマット
  // -------------------------------
  const stores = storeRoleConfig.stores || [];
  const roles = storeRoleConfig.roles || [];

  const storeRoles = storeRoleConfig.storeRoles || {};
  const positionRoles = storeRoleConfig.positionRoles || {};

  // -------------------------------
  // 🏪 店舗一覧
  // -------------------------------
  const storeList =
    stores.length > 0
      ? '```\n' + stores.join('\n') + '\n```'
      : '未登録';

  // -------------------------------
  // 👥 役職一覧
  // -------------------------------
  const roleList =
    roles.length > 0
      ? '```\n' +
        roles.map(r => (typeof r === 'string' ? r : r.name)).join('\n') +
        '\n```'
      : '未登録';

  // -------------------------------
  // 🏢 店舗 × ロール紐づけ
  // -------------------------------
  let storeRoleList = '未設定';
  if (Object.keys(storeRoles).length > 0) {
    storeRoleList = Object.entries(storeRoles)
      .map(([storeName, roleIds = []]) => {
        const rolesText = roleIds.length > 0
          ? roleIds.map(id => `<@&${id}>`).join(' ')
          : 'なし';
        return `**${storeName}**\n${rolesText}`;
      })
      .join('\n\n');
  }

  // -------------------------------
  // 👔 役職 × ロール紐づけ
  // -------------------------------
  let positionRoleList = '未設定';
  if (Object.keys(positionRoles).length > 0) {
    positionRoleList = Object.entries(positionRoles)
      .map(([positionId, roleIds = []]) => {
        const positionName = roles.find(r => r.id === positionId)?.name || positionId;
        const rolesText = roleIds.length > 0
          ? roleIds.map(id => `<@&${id}>`).join(' ')
          : 'なし';
        return `**${positionName}**\n${rolesText}`;
      })
      .join('\n\n');
  }

  // -------------------------------
  // 📜 ログ設定
  // -------------------------------
  const logFields = [
    { label: 'グローバルログチャンネル', id: 'globalLogChannel' },
    { label: '管理者ログチャンネル', id: 'adminLogChannel', fallbackId: 'adminLogChannelId' },
    { label: 'コマンドログスレッド', id: 'commandLogThread' },
    { label: '設定ログスレッド', id: 'settingLogThread' },
  ]
    .map(field => {
      let value = globalConfig[field.id];
      if (!value && field.fallbackId) {
        value = globalConfig[field.fallbackId];
      }
      return `**${field.label}**：${value ? `<#${value}>` : '未設定'}`;
    })
    .join('\n');

  // -------------------------------
  // 🔔 Slack通知
  // -------------------------------
  const slackInfo = globalConfig.slackWebhookUrl ? '🔗 設定済み' : '未設定';

  // -------------------------------
  // ⚙️ コマンド実行役職
  // -------------------------------
  const commandExecutorRole = globalConfig.commandExecutorRoleId
    ? `<@&${globalConfig.commandExecutorRoleId}>`
    : '未設定';

  // -------------------------------
  // 📌 Embed 作成
  // -------------------------------
  const embed = new EmbedBuilder()
    .setColor('#3498db')
    .setTitle('⚙️ 設定パネル')
    .addFields(
      { name: '🏪 登録済み店舗一覧', value: storeList },
      { name: '👥 登録済み役職一覧', value: roleList },
      { name: '🏢 店舗とロールの紐づけ', value: storeRoleList },
      { name: '👔 役職とロールの紐づけ', value: positionRoleList },
      { name: '📜 ログ設定', value: logFields },
      { name: '🔔 Slack通知自動化', value: slackInfo },
      { name: '⚙️ コマンド実行役職', value: commandExecutorRole },
    )
    .setTimestamp();

  // -------------------------------
  // ボタン群
  // -------------------------------
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_store_edit').setLabel('店舗名編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config_role_edit').setLabel('役職編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config_store_role_link').setLabel('店舗とロール紐づけ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_position_role_link').setLabel('役職とロール紐づけ').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_user_register').setLabel('ユーザー情報登録').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('config_command_role').setLabel('コマンド実行役職').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_global_log').setLabel('グローバルログ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_admin_log').setLabel('管理者ログ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_command_thread').setLabel('コマンドログ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config_setting_thread').setLabel('設定ログ').setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_slack_auto').setLabel('Slack通知').setStyle(ButtonStyle.Primary)
  );

  // -------------------------------
  // パネル更新 or 新規設置
  // -------------------------------
  let existingPanel = null;
  if (globalConfig.configPanelMessageId) {
    existingPanel = await channel.messages
      .fetch(globalConfig.configPanelMessageId)
      .catch(() => null);
    if (
      existingPanel &&
      (existingPanel.author.id !== channel.client.user.id ||
        existingPanel.embeds[0]?.title !== '⚙️ 設定パネル')
    ) {
      existingPanel = null;
    }
  }

  if (!existingPanel) {
    const messages = await channel.messages.fetch({ limit: 50 });
    existingPanel = messages.find(
      (m) => m.author.id === channel.client.user.id && m.embeds[0]?.title === '⚙️ 設定パネル'
    );
  }

  const content = { embeds: [embed], components: [row1, row2, row3, row4] };

  if (existingPanel) {
    await existingPanel.edit(content);
    console.log(`[ConfigPanel] 既存パネルを更新しました (ch: ${channel.name})`);
  } else {
    existingPanel = await channel.send(content);
    console.log(`[ConfigPanel] 新規設定パネルを設置しました (ch: ${channel.name})`);
  }

  if (existingPanel && existingPanel.id !== globalConfig.configPanelMessageId) {
    await saveGuildConfig(guildId, { configPanelMessageId: existingPanel.id });
  }
}

module.exports = { sendConfigPanel };
