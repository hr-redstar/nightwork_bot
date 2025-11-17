// src/utils/config/storeRoleConfigManager.js
// ----------------------------------------------------
// 店舗・役職・ロールメンバーの共通管理モジュール
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger');
const { readJSON, saveJSON } = require('../gcs');

// ====================================================
// 🧭 パス生成
// ====================================================

/**
 * 店舗・役職・ロール情報の保存パス
 * 例）{guildId}/config/店舗_役職_ロール.json
 */
function storeRoleConfigPath(guildId) {
  return `${guildId}/config/店舗_役職_ロール.json`;
}

// ====================================================
// 🧱 デフォルト構造
// ====================================================

function defaultStoreRoleConfig() {
  return {
    // 店舗名一覧（文字列）
    stores: [],
    // 利用するロール一覧 [{ id, name }]
    roles: [],
    // 店舗に紐づいているロールID一覧 { [storeName]: string[] }
    storeRoles: {},
    // ロールに紐づくメンバーID一覧 { [roleId]: string[] }
    roleMembers: {},
    updatedAt: null,
  };
}

// ====================================================
// ⚙️ 読み書き
// ====================================================

/**
 * 店舗・役職設定の読み込み
 * @param {string} guildId
 * @returns {Promise<ReturnType<typeof defaultStoreRoleConfig>>}
 */
async function loadStoreRoleConfig(guildId) {
  const path = storeRoleConfigPath(guildId);

  try {
    const data = (await readJSON(path)) || {};
    const base = defaultStoreRoleConfig();

    return {
      ...base,
      ...data,
      stores: Array.isArray(data.stores) ? data.stores : base.stores,
      roles: Array.isArray(data.roles) ? data.roles : base.roles,
      storeRoles: data.storeRoles || base.storeRoles,
      roleMembers: data.roleMembers || base.roleMembers,
      updatedAt: data.updatedAt || base.updatedAt,
    };
  } catch (err) {
    logger.error(`❌ storeRoleConfig 読込エラー (${guildId}):`, err);
    return defaultStoreRoleConfig();
  }
}

/**
 * 店舗・役職設定の保存
 * @param {string} guildId
 * @param {object} config
 */
async function saveStoreRoleConfig(guildId, config) {
  const path = storeRoleConfigPath(guildId);
  const saveData = {
    ...config,
    updatedAt: dayjs().format('YYYY/MM/DD HH:mm'),
  };

  try {
    await saveJSON(path, saveData);
  } catch (err) {
    logger.error(`❌ storeRoleConfig 保存エラー (${guildId}):`, err);
  }
}

// ====================================================
// 🏪 店舗操作
// ====================================================

/**
 * 店舗を追加（重複は無視）
 */
async function addStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);
  if (!config.stores.includes(storeName)) {
    config.stores.push(storeName);
  }
  await saveStoreRoleConfig(guildId, config);
  return config;
}

/**
 * 店舗を削除（storeRoles の紐づけも削除）
 */
async function removeStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);

  config.stores = config.stores.filter((s) => s !== storeName);
  if (config.storeRoles[storeName]) {
    delete config.storeRoles[storeName];
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 🎭 ロール操作
// ====================================================

/**
 * ロールを追加（Discord Role オブジェクト or {id,name}）
 * @param {string} guildId
 * @param {{id:string, name:string} | import('discord.js').Role} role
 */
async function addRole(guildId, role) {
  const config = await loadStoreRoleConfig(guildId);

  const roleId = role.id;
  const roleName = role.name;

  if (!config.roles.find((r) => r.id === roleId)) {
    config.roles.push({ id: roleId, name: roleName });
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

/**
 * ロールを削除（storeRoles, roleMembers もクリーンアップ）
 */
async function removeRole(guildId, roleId) {
  const config = await loadStoreRoleConfig(guildId);

  config.roles = config.roles.filter((r) => r.id !== roleId);

  // 店舗ごとの紐づけからも削除
  for (const store of Object.keys(config.storeRoles)) {
    config.storeRoles[store] = (config.storeRoles[store] || []).filter(
      (id) => id !== roleId,
    );
    if (!config.storeRoles[store].length) {
      delete config.storeRoles[store];
    }
  }

  // ロールメンバー情報も削除
  if (config.roleMembers[roleId]) {
    delete config.roleMembers[roleId];
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 🔗 店舗とロールの紐づけ
// ====================================================

/**
 * 店舗にロールを紐づけ
 */
async function linkStoreRole(guildId, storeName, roleId) {
  const config = await loadStoreRoleConfig(guildId);

  if (!config.stores.includes(storeName)) {
    config.stores.push(storeName);
  }

  if (!config.roles.find((r) => r.id === roleId)) {
    // ロール名までは分からないので、最低限IDだけ登録
    config.roles.push({ id: roleId, name: '(unknown)' });
  }

  const list = config.storeRoles[storeName] || [];
  if (!list.includes(roleId)) {
    list.push(roleId);
  }
  config.storeRoles[storeName] = list;

  await saveStoreRoleConfig(guildId, config);
  return config;
}

/**
 * 店舗とロールの紐づけを解除
 */
async function unlinkStoreRole(guildId, storeName, roleId) {
  const config = await loadStoreRoleConfig(guildId);

  const list = config.storeRoles[storeName] || [];
  config.storeRoles[storeName] = list.filter((id) => id !== roleId);
  if (!config.storeRoles[storeName].length) {
    delete config.storeRoles[storeName];
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 👥 ロールに紐づくユーザー一覧を反映
// ====================================================

/**
 * 現在のギルド状態から、roleMembers を再構築して保存
 * @param {import('discord.js').Guild} guild
 */
async function refreshRoleMembers(guild) {
  const guildId = guild.id;
  const config = await loadStoreRoleConfig(guildId);

  // 全メンバーをフェッチ（GuildMembers intent が必須）
  const members = await guild.members.fetch();

  const roleMembersMap = {};

  for (const role of config.roles) {
    const roleId = role.id;
    const users = members
      .filter((m) => m.roles.cache.has(roleId))
      .map((m) => m.id);

    if (users.length) {
      roleMembersMap[roleId] = users;
    }
  }

  config.roleMembers = roleMembersMap;
  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 📦 エクスポート
// ====================================================

module.exports = {
  storeRoleConfigPath,
  loadStoreRoleConfig,
  saveStoreRoleConfig,

  addStore,
  removeStore,

  addRole,
  removeRole,

  linkStoreRole,
  unlinkStoreRole,

  refreshRoleMembers,
};