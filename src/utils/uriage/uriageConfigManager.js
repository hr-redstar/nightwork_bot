// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上設定マネージャー
// (ConfigManager + Zod 移行済み)
// ----------------------------------------------------

const ConfigManager = require('../../config/ConfigManager');
const { z } = require('zod');

// --- Global Config Schema ---
const UriageGlobalConfigSchema = z.object({
  configPanel: z.any().nullable().optional(),
  panels: z.record(z.any()).default({}),
  approverPositionIds: z.array(z.string()).default([]),
  approverRoleIds: z.array(z.string()).default([]),
  csvUpdatedAt: z.string().nullable().optional(),
}).passthrough();

// --- Store Config Schema ---
const UriageStoreConfigSchema = z.object({
  storeId: z.string().optional(),
  channelId: z.string().nullable().optional(),
  messageId: z.string().nullable().optional(),

  viewRoleIds: z.array(z.string()).default([]),
  requestRoleIds: z.array(z.string()).default([]),
  viewRolePositionIds: z.array(z.string()).default([]),
  requestRolePositionIds: z.array(z.string()).default([]),

  items: z.array(z.any()).default([]),
  lastUpdated: z.string().nullable().optional(),
}).passthrough();

// Union Schema
const UriageSchema = z.union([UriageGlobalConfigSchema, UriageStoreConfigSchema]);

// --- Instance ---
// baseDir='uriage', fileName='config.json'
const manager = new ConfigManager({
  baseDir: 'uriage',
  fileName: 'config.json',
  schema: UriageSchema,
});

// --- Helper Functions ---

async function loadUriageConfig(guildId) {
  return await manager.loadGlobal(guildId, { panels: {} });
}

async function saveUriageConfig(guildId, data) {
  await manager.saveGlobal(guildId, data);
}

async function loadUriageStoreConfig(guildId, storeId) {
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

async function saveUriageStoreConfig(guildId, storeId, data) {
  const updateData = { ...data, lastUpdated: new Date().toISOString() };
  if (!updateData.storeId) updateData.storeId = storeId;
  await manager.saveStore(guildId, storeId, updateData);
}

module.exports = {
  manager,
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
  UriageGlobalConfigSchema,
  UriageStoreConfigSchema,
};
