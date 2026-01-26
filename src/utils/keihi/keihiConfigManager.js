// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定マネージャー
// (ConfigManager + Zod 移行済み)
// ----------------------------------------------------

const ConfigManager = require('../../config/ConfigManager');
const { z } = require('zod');

// --- Global Config Schema ---
const KeihiGlobalConfigSchema = z.object({
  settingPanelChannelId: z.string().nullable().optional(),
  settingPanelMessageId: z.string().nullable().optional(),
}).passthrough();

// --- Store Config Schema ---
const KeihiStoreConfigSchema = z.object({
  storeId: z.string().optional(), // 追加
  storeName: z.string().optional(), // 互換性のためoptionalだが通常は必須
  viewerRoleIds: z.array(z.string()).default([]),
  approverRoleIds: z.array(z.string()).default([]),
  requesterRoleIds: z.array(z.string()).default([]),

  // Role Position IDs (keihiStoreConfigManager参照)
  viewRolePositionIds: z.array(z.string()).default([]), // 追加
  requestRolePositionIds: z.array(z.string()).default([]), // 追加

  requestPanelChannelId: z.string().nullable().optional(),
  requestPanelMessageId: z.string().nullable().optional(),
  logChannelId: z.string().nullable().optional(),

  items: z.array(z.any()).default([]),
  lastUpdated: z.string().nullable().optional(),
}).passthrough();

// Union Schema
const KeihiSchema = z.union([KeihiGlobalConfigSchema, KeihiStoreConfigSchema]);

// --- Instance ---
// baseDir='keihi', fileName='config.json'
const manager = new ConfigManager({
  baseDir: 'keihi',
  fileName: 'config.json',
  schema: KeihiSchema,
});

// --- Helper Functions (Backward Compatibility) ---

/**
 * 経費設定読み込み (Global)
 */
async function loadKeihiConfig(guildId) {
  return await manager.loadGlobal(guildId);
}

/**
 * 経費設定保存 (Global)
 */
async function saveKeihiConfig(guildId, data) {
  await manager.saveGlobal(guildId, data);
}

/**
 * 店舗ごとの設定読み込み
 */
async function loadKeihiStoreConfig(guildId, storeId) {
  // ConfigManager.loadStore は GCS/{guildId}/keihi/{storeId}/config.json を読む
  // デフォルト値をZodスキーマが提供する
  const defaults = {
    storeId,
    viewRoleIds: [],
    requestRoleIds: [],
    viewRolePositionIds: [],
    requestRolePositionIds: [],
    items: [],
  };
  return await manager.loadStore(guildId, storeId, defaults);
}

/**
 * 店舗設定保存
 */
async function saveKeihiStoreConfig(guildId, storeId, data) {
  // lastUpdated 更新
  const updateData = { ...data, lastUpdated: new Date().toISOString() };
  if (!updateData.storeId) updateData.storeId = storeId;

  await manager.saveStore(guildId, storeId, updateData);
}

module.exports = {
  manager, // 新しいmanagerインスタンス
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
  // Schemas (テスト用などに公開)
  KeihiGlobalConfigSchema,
  KeihiStoreConfigSchema,
};
