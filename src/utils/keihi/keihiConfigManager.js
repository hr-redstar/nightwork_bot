// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定の GCS 読み書きユーティリティ
//   - ギルド共通:   GCS/{guildId}/keihi/config.json
//   - 店舗ごと設定: GCS/{guildId}/keihi/{storeName}/config.json
// ----------------------------------------------------

const path = require('path');
const { readJSON, saveJSON } = require('../gcs');

// ==============================
// パスヘルパー
// ==============================

function getKeihiGlobalConfigPath(guildId) {
  if (!guildId) throw new Error('[keihiConfigManager] guildId が未指定です');
  return path.join('GCS', guildId, 'keihi', 'config.json');
}

function getKeihiStoreConfigPath(guildId, storeName) {
  if (!guildId) throw new Error('[keihiConfigManager] guildId が未指定です');
  if (!storeName) throw new Error('[keihiConfigManager] storeName が未指定です');
  return path.join('GCS', guildId, 'keihi', storeName, 'config.json');
}

// 互換用
const getKeihiConfigPath = getKeihiStoreConfigPath;

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
// 内部ユーティリティ
// ==============================

async function safeLoadJson(pathLogical, defaults) {
  try {
    const data = await readJSON(pathLogical);
    return { ...defaults, ...(data || {}) };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ...defaults };
    throw err;
  }
}

// ==============================
// ギルド共通設定
// ==============================

async function loadKeihiGlobalConfig(guildId) {
  const filePath = getKeihiGlobalConfigPath(guildId);
  return safeLoadJson(filePath, createDefaultGlobalConfig());
}

async function saveKeihiGlobalConfig(guildId, config) {
  const filePath = getKeihiGlobalConfigPath(guildId);
  await saveJSON(filePath, config || {});
  return config;
}

async function updateKeihiGlobalConfig(guildId, updater) {
  const current = await loadKeihiGlobalConfig(guildId);
  const next =
    typeof updater === 'function'
      ? await updater(current)
      : { ...current, ...(updater || {}) };
  await saveKeihiGlobalConfig(guildId, next);
  return next;
}

// 互換エイリアス（旧API対応）
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
  const filePath = getKeihiStoreConfigPath(guildId, storeName);
  return safeLoadJson(filePath, createDefaultStoreConfig(storeName));
}

async function saveKeihiStoreConfig(guildId, storeName, config) {
  const filePath = getKeihiStoreConfigPath(guildId, storeName);
  await saveJSON(filePath, config || {});
  return config;
}

async function updateKeihiStoreConfig(guildId, storeName, updater) {
  const current = await loadKeihiStoreConfig(guildId, storeName);
  const next =
    typeof updater === 'function'
      ? await updater(current)
      : { ...current, ...(updater || {}) };
  await saveKeihiStoreConfig(guildId, storeName, next);
  return next;
}

module.exports = {
  // パス
  getKeihiGlobalConfigPath,
  getKeihiStoreConfigPath,
  getKeihiConfigPath,

  // デフォルト
  createDefaultGlobalConfig,
  createDefaultStoreConfig,

  // ギルド共通設定
  loadKeihiGlobalConfig,
  saveKeihiGlobalConfig,
  updateKeihiGlobalConfig,
  // 互換エイリアス（旧API）
  loadKeihiConfig,
  saveKeihiConfig,

  // 店舗別設定
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
  updateKeihiStoreConfig,
};
