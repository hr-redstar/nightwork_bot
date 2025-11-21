﻿const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 設定パネルを送信・更新
 */
async function sendConfigPanel(channel) {
  const guildId = channel.guild.id;

  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const globalConfig = await getGuildConfig(guildId);

  const stores = storeRoleConfig.stores || [];
  const roles = storeRoleConfig.roles || [];
  const storeRoles = storeRoleConfig.storeRoles || {};
  const roleUsers = storeRoleConfig.roleUsers || {};

  // -------------------------------
  // 🔵 登録済み店舗一覧
  // -------------------------------
  const storeList =
    stores.length > 0 ? stores.map(s => `・${s}`).join('\n') : '未登録';

  // -------------------------------
  // 🟣 登録済み役職一覧
  // -------------------------------
  const roleList =
    roles.length > 0 ? roles.map(r => `・${r.name}`).join('\n') : '未登録';

  // -------------------------------
  // 店舗とロールの紐づけ一覧
  // -------------------------------
  let storeRoleList = '未登録';
  if (Object.keys(storeRoles).length > 0) {
    storeRoleList = Object.entries(storeRoles)
      .map(([store, roleIds]) => {
        const roleMentions = roleIds.map(id => `<@&${id}>`).join('\n');
        return `**${store}**\n${roleMentions}`;
      })
      .join('\n\n');
  }

  // -------------------------------
  // 役職とロールの紐づけ一覧
  // -------------------------------
  let roleUserList = '未登録';
  if (Object.keys(roleUsers).length > 0) {
    roleUserList = Object.entries(roleUsers)
      .map(([roleId, userIds]) => {
        const roleName = roles.find(r => r.id === roleId)?.name || roleId;
        const userMentions = userIds.map(uid => `<@${uid}>`).join('\n');
        return `**${roleName}**\n${userMentions}`;
      })
      .join('\n\n');
  }

  // -------------------------------
  // ログ設定
  // -------------------------------
  const logFields = [
    { label: 'グローバルログチャンネル', id: 'globalLogChannel' },
    { label: '管理者ログチャンネル', id: 'adminLogChannel' },
    { label: 'コマンドログスレッド', id: 'commandLogThread' },
    { label: '設定ログスレッド', id: 'settingLogThread' },
  ]
    .map(field => {
      const v = globalConfig?.[field.id];
      return `**${field.label}**：${v ? `<#${v}>` : '未設定'}`;
    })
    .join('\n');

  // -------------------------------
  // 🔔 Slack通知（簡易）
  // -------------------------------
  const slackInfo = globalConfig?.slackBotName
    ? `bot名：${globalConfig.slackBotName}\n最終更新：${globalConfig.slackUpdatedAt}`
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
      { name: '🏪 店舗とロールの紐づけ一覧', value: storeRoleList },
      { name: '👥 役職とユーザーの紐づけ一覧', value: roleUserList },
      { name: '📜 ログ設定', value: logFields },
      { name: '🔔 Slack通知自動化', value: slackInfo },
    )
    .setTimestamp();

  // -------------------------------
  // 🟦 ボタン作成
  // -------------------------------
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config:edit_store').setLabel('店舗名編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config:edit_role').setLabel('役職編集').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('config:link_store_role').setLabel('店舗とロールの紐づけ').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config:link_role_user').setLabel('役職とユーザーの紐づけ').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config:user_register').setLabel('ユーザー情報登録').setStyle(ButtonStyle.Success),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config:set_global_log').setLabel('グローバルログ設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config:set_admin_log').setLabel('管理者ログ設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config:set_command_log').setLabel('コマンドログ設定').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('config:set_setting_log').setLabel('設定ログ設定').setStyle(ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config:slack').setLabel('Slack通知').setStyle(ButtonStyle.Primary),
  );

  // 送信 or 更新
  return channel.send({
    embeds: [embed],
    components: [row1, row2, row3, row4],
  });
}

module.exports = { sendConfigPanel };
