// src/utils/config/configAccessor.js
const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

/**
 * GCSから店舗リストを取得
 * @param {string} guildId
 * @returns {Promise<string[]>}
 */
async function getStoreList(guildId) {
  const config = await loadStoreRoleConfig(guildId);
  return config?.stores || [];
}

/**
 * GCSから役職リストを取得
 * @param {string} guildId
 * @returns {Promise<{id: string, name: string}[]>}
 */
async function getRoleList(guildId) {
  const config = await loadStoreRoleConfig(guildId);
  // roles は {id, name} のオブジェクト配列
  return config?.roles || [];
}

module.exports = {
  getStoreList,
  getRoleList,
};