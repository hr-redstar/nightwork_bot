const { readJSON, saveJSON } = require('../gcs');
const basePath = guildId => `GCS/${guildId}/config/店舗_役職_ロール.json`;

/**
 * 設定ファイルを読み込み
 */
async function loadStoreRoleConfig(guildId) {
  const path = basePath(guildId);
  const data = await readJSON(path);
  if (!data) {
    return {
      stores: [],
      roles: [],
      link_store_role: {},
      link_role_role: {}
    };
  }
  return data;
}

/**
 * 設定ファイルを保存
 */
async function saveStoreRoleConfig(guildId, config) {
  const path = basePath(guildId);
  await saveJSON(path, config);
}

/**
 * 店舗・役職リストの更新
 */
async function updateStoreRoleList(guildId, key, list) {
  const config = await loadStoreRoleConfig(guildId);
  config[key] = list;
  await saveStoreRoleConfig(guildId, config);
  return config;
}

/**
 * 紐づけ設定の更新
 */
async function updateStoreRoleLink(guildId, key, storeOrRole, roleIds) {
  const config = await loadStoreRoleConfig(guildId);
  config[key][storeOrRole] = roleIds;
  await saveStoreRoleConfig(guildId, config);
  return config;
}

module.exports = {
  loadStoreRoleConfig,
  saveStoreRoleConfig,
  updateStoreRoleList,
  updateStoreRoleLink
};