// src/utils/config/storeRoleConfigManager.js
// ----------------------------------------------------
// 店舗・役職・ロールメンバーの共通管理モジュール（完全最新版）
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger');
const BaseConfigManager = require('../baseConfigManager');

// インスタンス作成
// GCS/{guildId}/config/店舗_役職_ロール.json に対応
const manager = new BaseConfigManager({
  baseDir: 'config',
  fileName: '店舗_役職_ロール.json',
});

// ====================================================
// 🧭 パス生成
// ====================================================

function storeRoleConfigPath(guildId) {
  return manager.getGlobalPath(guildId);
}

// ====================================================
// 🧱 デフォルト構造
// ====================================================

function defaultStoreRoleConfig() {
  return {
    stores: [],                 // 店舗名一覧
    roles: [],                  // [{id, name}]
    storeRoles: {},             // { 店舗名: [roleId] }
    positionRoles: {},          // { 役職ID: [roleId] }
    roleMembers: {},            // { roleId: [userId] }
    updatedAt: null,
  };
}

// ====================================================
// 🔧 正規化（最重要）
// ====================================================

function normalizeStoreRoleConfig(raw) {
  const base = defaultStoreRoleConfig();
  const data = raw || {};

  return {
    stores: Array.isArray(data.stores) ? data.stores : [],
    roles: Array.isArray(data.roles) ? data.roles : [],
    storeRoles: typeof data.storeRoles === 'object' ? data.storeRoles : {},
    positionRoles: typeof data.positionRoles === 'object' ? data.positionRoles : {},
    roleMembers: typeof data.roleMembers === 'object' ? data.roleMembers : {},
    updatedAt: data.updatedAt ?? null,
  };
}

// ====================================================
// 📥 読み込み / 📤 保存
// ====================================================

async function loadStoreRoleConfig(guildId) {
  try {
    const data = await manager.loadGlobal(guildId, defaultStoreRoleConfig());
    return normalizeStoreRoleConfig(data);
  } catch (err) {
    logger.warn(`⚠️ storeRoleConfig 読み込み失敗 → デフォルト使用 (${guildId})`, err);
    return defaultStoreRoleConfig();
  }
}

async function saveStoreRoleConfig(guildId, config) {
  const saveData = {
    ...normalizeStoreRoleConfig(config),
    updatedAt: dayjs().format('YYYY/MM/DD HH:mm:ss'),
  };

  try {
    await manager.saveGlobal(guildId, saveData);
    logger.info(`💾 storeRoleConfig 保存 (${guildId})`);
  } catch (err) {
    logger.error(`❌ storeRoleConfig 保存エラー (${guildId})`, err);
  }
}

// ====================================================
// 🏪 店舗操作
// ====================================================

async function addStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);

  if (!config.stores.includes(storeName)) {
    config.stores.push(storeName);
  }
  if (!config.storeRoles[storeName]) {
    config.storeRoles[storeName] = [];
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

async function removeStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);

  config.stores = config.stores.filter((s) => s !== storeName);
  delete config.storeRoles[storeName]; // 紐づけだけ削除

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 🎭 ロール操作（最新版）
// ====================================================

async function addRole(guildId, role) {
  const config = await loadStoreRoleConfig(guildId);

  const roleId = role.id;
  const roleName = role.name;

  const existing = config.roles.find((r) => r.id === roleId);

  if (!existing) {
    config.roles.push({ id: roleId, name: roleName });
  } else if (existing.name !== roleName) {
    // ロール名の変更に対応
    existing.name = roleName;
  }

  if (!config.roleMembers[roleId]) {
    config.roleMembers[roleId] = [];
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

async function removeRole(guildId, roleId) {
  const config = await loadStoreRoleConfig(guildId);

  config.roles = config.roles.filter((r) => r.id !== roleId);

  // 店舗紐づけから削除
  for (const store of Object.keys(config.storeRoles)) {
    config.storeRoles[store] = (config.storeRoles[store] || []).filter(
      (id) => id !== roleId
    );
  }

  // メンバー情報は空配列として残す
  config.roleMembers[roleId] = [];

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 🔗 店舗とロールの紐づけ（最新版）
// ====================================================

async function linkStoreRole(guildId, storeName, roleId, roleName = null) {
  const config = await loadStoreRoleConfig(guildId);

  if (!config.stores.includes(storeName)) {
    config.stores.push(storeName);
  }
  if (!config.storeRoles[storeName]) {
    config.storeRoles[storeName] = [];
  }

  // ロール名がわかる場合は更新
  if (roleName) {
    const existing = config.roles.find((r) => r.id === roleId);
    if (existing) {
      existing.name = roleName;
    } else {
      config.roles.push({ id: roleId, name: roleName });
    }
  }

  if (!config.storeRoles[storeName].includes(roleId)) {
    config.storeRoles[storeName].push(roleId);
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

async function unlinkStoreRole(guildId, storeName, roleId) {
  const config = await loadStoreRoleConfig(guildId);

  if (config.storeRoles[storeName]) {
    config.storeRoles[storeName] = config.storeRoles[storeName].filter(
      (id) => id !== roleId
    );
  }

  await saveStoreRoleConfig(guildId, config);
  return config;
}

// ====================================================
// 👥 ロールメンバーの更新
// ====================================================

async function refreshRoleMembers(guild) {
  const guildId = guild.id;
  const config = await loadStoreRoleConfig(guildId);

  const members = await guild.members.fetch();
  const roleMembers = {};

  for (const role of config.roles) {
    const roleId = role.id;
    const matched = members.filter((m) => m.roles.cache.has(roleId));

    roleMembers[roleId] = matched.map((m) => m.id); // 空でも配列にする
  }

  config.roleMembers = roleMembers;

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
