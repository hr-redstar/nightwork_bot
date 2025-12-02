// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費機能 全体設定 ({guildId}/keihi/config.json)
// 旧フォーマット：
//   - approvalRoles
//   - panelMap
//   - panelMessageMap
//   - settingPanel
//   - …
// 新フォーマット：
//   - configPanel
//   - approverRoleIds
//   - panels
// ----------------------------------------------------

const gcs = require('../gcs');
const logger = require('../logger');

/**
 * keihi グローバル設定ファイルパス
 *   {guildId}/keihi/config.json
 */
function keihiGlobalConfigPath(guildId) {
  return `${guildId}/keihi/config.json`;
}

/**
 * ベース構造
 * 旧フォーマット用のフィールドも全部用意しておく
 */
function createDefaultKeihiConfig() {
  return {
    // 新フォーマット
    configPanel: {
      channelId: null,
      messageId: null,
    },
    approverRoleIds: [],   // 新: 承認役職ID一覧
    panels: {},            // 新: 店舗別パネル設定 { [storeId]: { channelId, messageId, ... } }

    // 旧フォーマット（互換のため残す）
    approvalRoles: [],             // 旧: approverRoleIds の元
    viewRoles: [],
    applyRoles: [],
    panelMap: {},
    panelMessageMap: {},
    threadViewRolesByStore: {},
    applyRolesByStore: {},
    itemsByStore: {},
    settingPanel: null,

    // メタ情報
    lastUpdated: null,
  };
}

/**
 * 経費グローバル設定の読み込み
 *  - 旧フォーマットのフィールドもそのまま残す
 *  - configPanel が無ければ settingPanel を fallback で使う
 *  - approverRoleIds が無ければ approvalRoles を使う
 */
async function loadKeihiConfig(guildId) {
  const path = keihiGlobalConfigPath(guildId);
  try {
    const raw = (await gcs.readJSON(path)) || {};
    const base = createDefaultKeihiConfig();

    // ベースに raw をマージ（旧フィールドも全部残す）
    const merged = {
      ...base,
      ...raw,
      configPanel: {
        ...base.configPanel,
        ...(raw.configPanel || {}),
      },
    };

    // configPanel が無くて settingPanel があれば流用
    if (
      (!merged.configPanel || !merged.configPanel.channelId) &&
      merged.settingPanel &&
      merged.settingPanel.channelId
    ) {
      merged.configPanel = {
        channelId: merged.settingPanel.channelId,
        messageId: merged.settingPanel.messageId,
      };
    }

    // approverRoleIds が空で、approvalRoles があれば流用
    if (
      (!Array.isArray(merged.approverRoleIds) ||
        merged.approverRoleIds.length === 0) &&
      Array.isArray(merged.approvalRoles)
    ) {
      merged.approverRoleIds = merged.approvalRoles.slice();
    }

    // panels が undefined / 不正 の場合は空オブジェクトに
    if (!merged.panels || typeof merged.panels !== 'object') {
      merged.panels = {};
    }

    return merged;
  } catch (err) {
    logger.warn(
      '[keihiConfigManager] keihi/config.json 読み込み失敗 -> デフォルト使用',
      err,
    );
    return createDefaultKeihiConfig();
  }
}

/**
 * 経費グローバル設定の保存
 *  - 旧フィールドもそのまま書き戻す
 *  - lastUpdated を現在時刻で更新
 */
async function saveKeihiConfig(guildId, config) {
  const path = keihiGlobalConfigPath(guildId);
  try {
    const base = createDefaultKeihiConfig();

    const saveData = {
      ...base,
      ...config,
      configPanel: {
        ...base.configPanel,
        ...(config.configPanel || {}),
      },
      lastUpdated: new Date().toISOString(),
    };

    await gcs.saveJSON(path, saveData);
  } catch (err) {
    logger.error('[keihiConfigManager] keihi/config.json 保存失敗', err);
    throw err;
  }
}

// ----------------------------------------------------
// 経費機能 店舗別設定 ({guildId}/keihi/{storeId}/config.json)
// ----------------------------------------------------

/**
 * keihi 店舗別設定ファイルパス
 *   {guildId}/keihi/{storeId}/config.json
 */
function keihiStoreConfigPath(guildId, storeId) {
  return `${guildId}/keihi/${storeId}/config.json`;
}

/**
 * 経費店舗別設定の読み込み
 *  - ここでは素の JSON をそのまま返す（デフォルト構成は gcsKeihiManager 側でも提供）
 */
async function loadKeihiStoreConfig(guildId, storeId) {
  const path = keihiStoreConfigPath(guildId, storeId);
  try {
    const config = (await gcs.readJSON(path)) || {};
    return config;
  } catch (err) {
    logger.warn(
      `[keihiConfigManager] ${path} 読み込み失敗 -> デフォルト使用`,
      err,
    );
    return {};
  }
}

/**
 * 経費店舗別設定の保存
 *  - 既存の設定を読み込んでからマージして上書き
 */
async function saveKeihiStoreConfig(guildId, storeId, newConfig) {
  const path = keihiStoreConfigPath(guildId, storeId);
  try {
    const existingConfig = await loadKeihiStoreConfig(guildId, storeId);
    const mergedConfig = {
      ...existingConfig,
      ...newConfig,
      lastUpdated: new Date().toISOString(),
    };
    await gcs.saveJSON(path, mergedConfig);
  } catch (err) {
    logger.error(`[keihiConfigManager] ${path} 保存失敗`, err);
    throw err;
  }
}

module.exports = {
  // 全体設定
  keihiGlobalConfigPath,
  loadKeihiConfig,
  saveKeihiConfig,

  // 店舗別設定
  keihiStoreConfigPath,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
};
