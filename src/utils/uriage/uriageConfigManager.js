// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上機能の GCS 読み書きユーティリティ
// ----------------------------------------------------

const BaseConfigManager = require('../baseConfigManager');

const manager = new BaseConfigManager({
  baseDir: 'uriage',
  fileName: 'config.json',
});

// ----------------------------------------------------
// デフォルト
// ----------------------------------------------------
function createDefaultGlobalConfig() {
  return {
    configPanel: null, // { channelId, messageId }
    panels: {},        // { [storeId]: { channelId, messageId } }
    approverPositionIds: [],
    approverRoleIds: [], // 旧仕様フォールバック
    csvUpdatedAt: null,
  };
}

function createDefaultStoreConfig(storeId) {
  return {
    storeId,
    channelId: null,      // 売上報告パネルを設置したテキストチャンネル
    messageId: null,      // 売上報告パネルのメッセージID

    // ロールID直接指定
    viewRoleIds: [],      // スレッド閲覧ロールID
    requestRoleIds: [],   // 売上報告を申請できるロールID

    // 役職ID（店舗_役職_ロール.json の positionId 経由）
    viewRolePositionIds: [],
    requestRolePositionIds: [],

    items: [],            // 売上項目等があれば配列で
    lastUpdated: null,
  };
}

// ----------------------------------------------------
// ヘルパー
// ----------------------------------------------------

function normalizeStoreConfig(raw, storeId) {
  const base = createDefaultStoreConfig(storeId);
  const cfg = { ...base, ...(raw || {}) };

  cfg.storeId = storeId;
  if (!Array.isArray(cfg.viewRoleIds)) cfg.viewRoleIds = [];
  if (!Array.isArray(cfg.requestRoleIds)) cfg.requestRoleIds = [];
  if (!Array.isArray(cfg.viewRolePositionIds)) cfg.viewRolePositionIds = [];
  if (!Array.isArray(cfg.requestRolePositionIds)) cfg.requestRolePositionIds = [];
  if (!Array.isArray(cfg.items)) cfg.items = [];

  return cfg;
}

// ----------------------------------------------------
// 共通設定
// ----------------------------------------------------
async function loadUriageConfig(guildId) {
  return manager.loadGlobal(guildId, createDefaultGlobalConfig());
}

async function saveUriageConfig(guildId, config) {
  return manager.saveGlobal(guildId, config);
}

// ----------------------------------------------------
// 店舗別設定
// ----------------------------------------------------
async function loadUriageStoreConfig(guildId, storeId) {
  const defaults = createDefaultStoreConfig(storeId);
  const data = await manager.loadStore(guildId, storeId, defaults);
  return normalizeStoreConfig(data, storeId);
}

async function saveUriageStoreConfig(guildId, storeId, config) {
  const cfg = normalizeStoreConfig(config, storeId);
  cfg.lastUpdated = new Date().toISOString();
  return manager.saveStore(guildId, storeId, cfg);
}

// ----------------------------------------------------
// パスヘルパー (BaseConfigManagerプロキシ)
// ----------------------------------------------------
function getUriageGlobalConfigPath(guildId) {
  return manager.getGlobalPath(guildId);
}
function getUriageStoreConfigPath(guildId, storeId) {
  return manager.getStorePath(guildId, storeId);
}

module.exports = {
  getUriageGlobalConfigPath,
  getUriageStoreConfigPath,
  createDefaultGlobalConfig,
  createDefaultStoreConfig,
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
};
