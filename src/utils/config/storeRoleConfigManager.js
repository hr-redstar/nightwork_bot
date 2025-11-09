// src/utils/config/storeRoleConfigManager.js
// 店舗・役職・紐づけ設定ファイルを統合管理
const { getGuildConfig } = require('./gcsConfigManager');
const { readJSON, saveJSON } = require('../gcs');
const path = require('path');

/**
 * ファイルパス生成
 */
const getConfigPath = (guildId) =>
  `GCS/${guildId}/config/店舗_役職_ロール.json`;

/**
 * 設定ファイルを読み込み（存在しない場合はデフォルト構造を返す）
 */
async function loadStoreRoleConfig(guildId) {
  const pathKey = getConfigPath(guildId);
  try {
    const data = await readJSON(pathKey);
    // データがnullやundefinedの場合もデフォルト値を返す
    return data || { stores: [], roles: [], link_store_role: {}, link_role_role: {} };
  } catch (err) {
    // ファイルが存在しない等のエラーの場合もデフォルト値を返す
    if (err.code !== 'ENOENT') { // ファイルが見つからないエラー以外はログに出力
      console.warn(`⚠️ 店舗_役職_ロール設定を読み込みできませんでした (${guildId})`, err);
    }
    return { stores: [], roles: [], link_store_role: {}, link_role_role: {} };
  }
}

/**
 * 設定ファイルを保存
 */
async function saveStoreRoleConfig(guildId, config) {
  const pathKey = getConfigPath(guildId);
  await saveJSON(pathKey, config);
}

/**
 * 店舗または役職リストを更新
 * @param {'stores' | 'roles'} key
 */
async function updateList(guildId, key, list) {
  const config = await loadStoreRoleConfig(guildId);
  config[key] = list;
  await saveStoreRoleConfig(guildId, config);
  return config;
}

/**
 * 紐づけ設定を更新（店舗↔ロール or 役職↔ロール）
 */
async function updateLink(guildId, key, target, roleIds) {
  const config = await loadStoreRoleConfig(guildId);
  config[key] = config[key] || {};
  config[key][target] = roleIds;
  await saveStoreRoleConfig(guildId, config);
  return config;
}

module.exports = {
  getGuildConfig, // re-export for convenience
  loadStoreRoleConfig,
  saveStoreRoleConfig,
  updateList,
  updateLink,
};