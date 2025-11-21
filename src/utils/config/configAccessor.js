// src/utils/config/configAccessor.js
// ----------------------------------------------------
// 店舗・役職・ユーザー情報の読み取り用アクセサ（完全最新版）
// ----------------------------------------------------

const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

// ====================================================
// 🏪 店舗関連
// ====================================================

/**
 * 店舗名一覧を取得
 * @param {string} guildId
 * @returns {Promise<string[]>}
 */
async function getStoreList(guildId) {
  const config = await loadStoreRoleConfig(guildId);
  return config.stores || [];
}

/**
 * 店舗名が存在するか確認
 */
async function storeExists(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);
  return config.stores.includes(storeName);
}

// ====================================================
// 🎭 ロール関連
// ====================================================

/**
 * ロールオブジェクト一覧 [{ id, name }]
 */
async function getRoleObjects(guildId) {
  const config = await loadStoreRoleConfig(guildId);
  return config.roles || [];
}

/**
 * ロール名一覧 ["キャスト", "黒服", ...]
 */
async function getRoleList(guildId) {
  const roles = await getRoleObjects(guildId);
  return roles.map((r) => r.name);
}

/**
 * ロール1件を取得
 */
async function getRoleById(guildId, roleId) {
  const config = await loadStoreRoleConfig(guildId);
  return config.roles.find((r) => r.id === roleId) || null;
}

/**
 * ロール名から roleId を取得
 */
async function getRoleIdByName(guildId, roleName) {
  const config = await loadStoreRoleConfig(guildId);
  const item = config.roles.find((r) => r.name === roleName);
  return item?.id || null;
}

// ====================================================
// 🔗 店舗 ↔ ロール 紐づけ
// ====================================================

/**
 * 店舗に紐づいているロールID一覧
 * @returns {Promise<string[]>}
 */
async function getRoleIdsByStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);
  return config.storeRoles[storeName] || [];
}

/**
 * 店舗に紐づいているロール一覧（{id, name}[]）
 */
async function getRolesByStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);
  const roleIds = config.storeRoles[storeName] || [];
  return config.roles.filter((r) => roleIds.includes(r.id));
}

/**
 * 店舗に特定のroleが紐づいているか
 */
async function storeHasRole(guildId, storeName, roleId) {
  const ids = await getRoleIdsByStore(guildId, storeName);
  return ids.includes(roleId);
}

// ====================================================
// 👥 メンバー関連
// ====================================================

/**
 * ロールに紐づくメンバーID一覧
 */
async function getMembersByRole(guildId, roleId) {
  const config = await loadStoreRoleConfig(guildId);
  return config.roleMembers[roleId] || [];
}

/**
 * 店舗に紐づくロール全てに所属しているメンバーID一覧（重複排除）
 */
async function getMembersByStore(guildId, storeName) {
  const config = await loadStoreRoleConfig(guildId);
  const roleIds = config.storeRoles[storeName] || [];

  const set = new Set();

  for (const roleId of roleIds) {
    const members = config.roleMembers[roleId] || [];
    members.forEach((m) => set.add(m));
  }

  return Array.from(set);
}

/**
 * 全ユーザーID（重複なし）
 */
async function getAllUsers(guildId) {
  const config = await loadStoreRoleConfig(guildId);

  const set = new Set();
  for (const list of Object.values(config.roleMembers)) {
    list.forEach((m) => set.add(m));
  }
  return Array.from(set);
}

/**
 * ユーザーがどのロールに属しているか一覧取得
 */
async function getRolesByUserId(guildId, userId) {
  const config = await loadStoreRoleConfig(guildId);
  const roleIds = [];

  for (const [roleId, members] of Object.entries(config.roleMembers)) {
    if (members.includes(userId)) {
      roleIds.push(roleId);
    }
  }

  return roleIds;
}

/**
 * ユーザーが所属している店舗を一覧取得
 */
async function getStoresByUserId(guildId, userId) {
  const config = await loadStoreRoleConfig(guildId);
  const stores = [];

  for (const [storeName, roleIds] of Object.entries(config.storeRoles)) {
    for (const roleId of roleIds) {
      const members = config.roleMembers[roleId] || [];
      if (members.includes(userId)) {
        stores.push(storeName);
        break;
      }
    }
  }

  return stores;
}

// ====================================================
// 📦 エクスポート
// ====================================================

module.exports = {
  // 店舗
  getStoreList,
  storeExists,

  // ロール
  getRoleObjects,
  getRoleList,
  getRoleById,
  getRoleIdByName,

  // 店舗 ↔ ロール
  getRoleIdsByStore,
  getRolesByStore,
  storeHasRole,

  // メンバー
  getMembersByRole,
  getMembersByStore,
  getAllUsers,
  getRolesByUserId,
  getStoresByUserId,
};
