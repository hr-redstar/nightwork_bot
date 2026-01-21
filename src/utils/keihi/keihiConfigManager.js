// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定の GCS 読み書きユーティリティ
// ----------------------------------------------------

const BaseConfigManager = require('../baseConfigManager');

// インスタンス作成
const manager = new BaseConfigManager({
  baseDir: 'keihi',
  fileName: 'config.json',
});

// ==============================
// デフォルト値
// ==============================

function createDefaultGlobalConfig() {
  return {
    settingPanelChannelId: null,
    settingPanelMessageId: null,
  };
}

function createDefaultStoreConfig(storeName) {
  return {
    storeName,
    viewerRoleIds: [],
    approverRoleIds: [],
    requesterRoleIds: [],
    requestPanelChannelId: null,
    requestPanelMessageId: null,
    logChannelId: null,
    items: [],
  };
}

// ==============================
// ギルド共通設定
// ==============================

async function loadKeihiGlobalConfig(guildId) {
  return manager.loadGlobal(guildId, createDefaultGlobalConfig());
}

async function saveKeihiGlobalConfig(guildId, config) {
  return manager.saveGlobal(guildId, config);
}

async function updateKeihiGlobalConfig(guildId, updater) {
  const current = await loadKeihiGlobalConfig(guildId);
  const next =
    typeof updater === 'function'
      ? await updater(current)
      : { ...current, ...(updater || {}) };
  return saveKeihiGlobalConfig(guildId, next);
}

// 互換エイリアス
async function loadKeihiConfig(guildId) {
  return loadKeihiGlobalConfig(guildId);
}
async function saveKeihiConfig(guildId, config) {
  return saveKeihiGlobalConfig(guildId, config);
}

// ==============================
// 店舗別設定
// ==============================

async function loadKeihiStoreConfig(guildId, storeName) {
  const defaults = createDefaultStoreConfig(storeName);
  const data = await manager.loadStore(guildId, storeName, defaults);
  // storeName が保存データに含まれていない場合の安全策 (defaults由来なら入っているが念のため)
  if (!data.storeName) data.storeName = storeName;
  return data;
}

async function saveKeihiStoreConfig(guildId, storeName, config) {
  return manager.saveStore(guildId, storeName, config);
}

async function updateKeihiStoreConfig(guildId, storeName, updater) {
  const current = await loadKeihiStoreConfig(guildId, storeName);
  const next =
    typeof updater === 'function'
      ? await updater(current)
      : { ...current, ...(updater || {}) };
  return saveKeihiStoreConfig(guildId, storeName, next);
}

// ==============================
// パスヘルパー (BaseConfigManagerへのプロキシ)
// ==============================
function getKeihiGlobalConfigPath(guildId) {
  return manager.getGlobalPath(guildId);
}
function getKeihiStoreConfigPath(guildId, storeName) {
  return manager.getStorePath(guildId, storeName);
}
const getKeihiConfigPath = getKeihiStoreConfigPath;

module.exports = {
  getKeihiGlobalConfigPath,
  getKeihiStoreConfigPath,
  getKeihiConfigPath,
  createDefaultGlobalConfig,
  createDefaultStoreConfig,
  loadKeihiGlobalConfig,
  saveKeihiGlobalConfig,
  updateKeihiGlobalConfig,
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
  updateKeihiStoreConfig,
};
