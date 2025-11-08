// src/utils/config/configAccessor.js
const { getGuildConfig } = require('./gcsConfigManager');

/**
 * ギルドの基本設定を取得
 */
async function getBaseConfig(guildId) {
  const config = await getGuildConfig(guildId);
  if (!config) return null;

  return {
    globalLogChannel: config.globalLogChannel || null,
    adminLogChannel: config.adminLogChannel || null,
    commandLogThread: config.commandLogThread || null,
    settingLogThread: config.settingLogThread || null,
    slackAutomation: !!config.slackAutomation,
  };
}

/**
 * 店舗情報を取得
 */
async function getStoreList(guildId) {
  const config = await getGuildConfig(guildId);
  return config?.stores || [];
}

/**
 * 役職情報を取得
 */
async function getRoleList(guildId) {
  const config = await getGuildConfig(guildId);
  return config?.roles || [];
}

/**
 * 店舗とロール紐づけ情報を取得
 */
async function getStoreRoleLinks(guildId) {
  const config = await getGuildConfig(guildId);
  return config?.storeRoleLinks || {};
}

/**
 * 役職とロール紐づけ情報を取得
 */
async function getPositionRoleLinks(guildId) {
  const config = await getGuildConfig(guildId);
  return config?.positionRoleLinks || {};
}

/**
 * 指定ユーザーの店舗・役職情報を取得
 */
async function getUserInfo(guildId, userId) {
  const config = await getGuildConfig(guildId);
  return config?.userInfo?.[userId] || null;
}

/**
 * ユーザーの所属店舗・役職をロールから自動判定
 * @param {import('discord.js').GuildMember} member - Discordメンバー
 */
async function inferUserStoreRole(member) {
  const guildId = member.guild.id;
  const config = await getGuildConfig(guildId);
  if (!config) return null;

  const userRoles = member.roles.cache.map((r) => r.id);
  let store = null;
  let role = null;

  // 店舗ロール紐づけから判定
  for (const [storeName, roleIds] of Object.entries(config.storeRoleLinks || {})) {
    if (roleIds.some((r) => userRoles.includes(r))) {
      store = storeName;
      break;
    }
  }

  // 役職ロール紐づけから判定
  for (const [roleName, roleIds] of Object.entries(config.positionRoleLinks || {})) {
    if (roleIds.some((r) => userRoles.includes(r))) {
      role = roleName;
      break;
    }
  }

  return { store, role };
}

/**
 * ログ送信先をまとめて取得
 */
async function getLogTargets(guildId) {
  const config = await getGuildConfig(guildId);
  if (!config) return null;
  return {
    global: config.globalLogChannel || null,
    admin: config.adminLogChannel || null,
    commandThread: config.commandLogThread || null,
    settingThread: config.settingLogThread || null,
  };
}

module.exports = {
  getBaseConfig,
  getStoreList,
  getRoleList,
  getStoreRoleLinks,
  getPositionRoleLinks,
  getUserInfo,
  inferUserStoreRole,
  getLogTargets,
};

