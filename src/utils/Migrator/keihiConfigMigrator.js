// src/utils/Migrator/keihiConfigMigrator.js
// ----------------------------------------------------
// keihi/config.json 旧フォーマット → 新フォーマット マイグレーター
//   旧:
//     - approvalRoles
//     - panelMap
//     - panelMessageMap
//     - settingPanel
//     - threadViewRolesByStore / applyRolesByStore / itemsByStore
//   新:
//     - configPanel
//     - approverRoleIds
//     - panels[storeId] = { channelId, messageId, viewRoleIds, requestRoleIds, items }
// ----------------------------------------------------

const gcs = require('../gcs'); // ../gcs は正しい
const logger = require('../logger'); // ../logger は正しい
const { keihiGlobalConfigPath } = require('../keihi/keihiConfigManager');

// ベース構造
function createDefaultKeihiConfig() {
  return {
    configPanel: {
      channelId: null,
      messageId: null,
    },
    approverRoleIds: [],
    panels: {},
    lastUpdated: null,
  };
}

// 旧フォーマットかどうか判定
function isOldKeihiConfigFormat(raw) {
  if (!raw || typeof raw !== 'object') return false;

  // 旧キーが1つでもあれば旧フォーマットとみなす
  return (
    'approvalRoles' in raw ||
    'panelMap' in raw ||
    'panelMessageMap' in raw ||
    'settingPanel' in raw
  );
}

// 旧 → 新 構造へ変換（メモリ上）
function migrateKeihiConfigObject(old) {
  const base = createDefaultKeihiConfig();

  const newConfig = {
    ...base,
    configPanel: old.settingPanel || base.configPanel,
    approverRoleIds: Array.isArray(old.approvalRoles)
      ? old.approvalRoles.slice()
      : [],
    lastUpdated: old.lastUpdated || null,
    panels: {},
  };

  const panelMap = old.panelMap || {};
  const panelMessageMap = old.panelMessageMap || {};
  const threadViewRolesByStore = old.threadViewRolesByStore || {};
  const applyRolesByStore = old.applyRolesByStore || {};
  const itemsByStore = old.itemsByStore || {};

  const globalViewRoles = Array.isArray(old.viewRoles) ? old.viewRoles : [];
  const globalApplyRoles = Array.isArray(old.applyRoles) ? old.applyRoles : [];

  // storeId の全集合
  const storeIds = new Set([
    ...Object.keys(panelMap),
    ...Object.keys(panelMessageMap),
    ...Object.keys(threadViewRolesByStore),
    ...Object.keys(applyRolesByStore),
    ...Object.keys(itemsByStore),
  ]);

  for (const storeId of storeIds) {
    newConfig.panels[storeId] = {
      channelId: panelMap[storeId] || null,
      messageId: panelMessageMap[storeId] || null,
      viewRoleIds: threadViewRolesByStore[storeId] || globalViewRoles,
      requestRoleIds: applyRolesByStore[storeId] || globalApplyRoles,
      items: itemsByStore[storeId] || [],
    };
  }

  return newConfig;
}

/**
 * ギルド単位で keihi/config.json をマイグレートする
 *
 * @param {string} guildId
 * @param {{ dryRun?: boolean }} [options]
 *   - dryRun: true のときは保存せず、変換結果だけ返す
 *
 * @returns {Promise<{
 *   migrated: boolean,
 *   path: string,
 *   before: any,
 *   after: any | null
 * }>}
 */
async function migrateKeihiConfig(guildId, options = {}) {
  const { dryRun = false } = options;
  const path = keihiGlobalConfigPath(guildId);

  let raw;
  try {
    raw = (await gcs.readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[keihiMigrator] 読み込み失敗: ${path}`, err);
    return { migrated: false, path, before: null, after: null };
  }

  // すでに新フォーマットっぽい場合は何もしない
  if (raw && raw.panels && raw.configPanel) {
    logger.info(`[keihiMigrator] 既に新フォーマットのためスキップ: ${path}`);
    return { migrated: false, path, before: raw, after: null };
  }

  // 旧フォーマットでなければ何もしない
  if (!isOldKeihiConfigFormat(raw)) {
    logger.info(`[keihiMigrator] 旧フォーマットではないためスキップ: ${path}`);
    return { migrated: false, path, before: raw, after: null };
  }

  const migrated = migrateKeihiConfigObject(raw);

  if (!dryRun) {
    try {
      await gcs.saveJSON(path, migrated);
      logger.info(`[keihiMigrator] keihi/config.json を新フォーマットにマイグレートしました: ${path}`);
    } catch (err) {
      logger.error(`[keihiMigrator] 保存時にエラー: ${path}`, err);
      throw err;
    }
  } else {
    logger.info(`[keihiMigrator] dryRun のためファイルは保存していません: ${path}`);
  }

  return {
    migrated: true,
    path,
    before: raw,
    after: migrated,
  };
}

module.exports = {
  isOldKeihiConfigFormat,
  migrateKeihiConfigObject,
  migrateKeihiConfig,
};
