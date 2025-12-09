// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上機能の GCS 読み書きユーティリティ
//   - ギルド共通:   GCS/{guildId}/uriage/config.json
//   - 店舗ごと:     GCS/{guildId}/uriage/{storeId}/config.json
// ----------------------------------------------------

const path = require('path');
const { readJSON, saveJSON } = require('../gcs');

// ----------------------------------------------------
// パス
// ----------------------------------------------------
function getUriageGlobalConfigPath(guildId) {
  if (!guildId) throw new Error('[uriageConfigManager] guildId が未指定です');
  return path.join('GCS', guildId, 'uriage', 'config.json');
}

function getUriageStoreConfigPath(guildId, storeId) {
  if (!guildId) throw new Error('[uriageConfigManager] guildId が未指定です');
  if (!storeId) throw new Error('[uriageConfigManager] storeId が未指定です');
  return path.join('GCS', guildId, 'uriage', storeId, 'config.json');
}

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
async function safeLoadJson(logicalPath, defaults) {
  try {
    const data = await readJSON(logicalPath);
    return { ...defaults, ...(data || {}) };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ...defaults };
    throw err;
  }
}

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
  const p = getUriageGlobalConfigPath(guildId);
  return safeLoadJson(p, createDefaultGlobalConfig());
}

async function saveUriageConfig(guildId, config) {
  const p = getUriageGlobalConfigPath(guildId);
  await saveJSON(p, config || {});
  return config;
}

// ----------------------------------------------------
// 店舗別設定
// ----------------------------------------------------
async function loadUriageStoreConfig(guildId, storeId) {
  const p = getUriageStoreConfigPath(guildId, storeId);
  const data = await safeLoadJson(p, createDefaultStoreConfig(storeId));
  return normalizeStoreConfig(data, storeId);
}

async function saveUriageStoreConfig(guildId, storeId, config) {
  const p = getUriageStoreConfigPath(guildId, storeId);
  const cfg = normalizeStoreConfig(config, storeId);
  cfg.lastUpdated = new Date().toISOString();
  await saveJSON(p, cfg);
  return cfg;
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
