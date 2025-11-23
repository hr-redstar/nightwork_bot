// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定およびデータパス管理（最新版）
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger');
const { readJSON, saveJSON, exists } = require('../gcs');

// ===============================================
// パス生成ロジック
// ===============================================

/**
 * グローバル経費設定
 * GCS/ギルドID/keihi/config.json
 */
function globalConfigPath(guildId) {
  return `${guildId}/keihi/config.json`;
}

/**
 * 店舗別 設定ファイル
 * GCS/ギルドID/keihi/店舗名/config.json
 */
function storeConfigPath(guildId, store) {
  return `${guildId}/keihi/${store}/config.json`;
}

/**
 * 日別経費データ
 * GCS/ギルドID/keihi/店舗名/年/月/日/年月日.json
 * 例）123456789012345678/keihi/redstar/2025/11/23/20251123.json
 */
function dailyDataPath(guildId, store, y, m, d) {
  const ymd = `${y}${m}${d}`;
  return `${guildId}/keihi/${store}/${y}/${m}/${d}/${ymd}.json`;
}

/**
 * 月別経費データ
 * GCS/ギルドID/keihi/店舗名/年/月/年月.json
 * 例）.../2025/11/202511.json
 */
function monthlyDataPath(guildId, store, y, m) {
  const ym = `${y}${m}`;
  return `${guildId}/keihi/${store}/${y}/${m}/${ym}.json`;
}

/**
 * 年別経費データ
 * GCS/ギルドID/keihi/店舗名/年/年.json
 * 例）.../2025/2025.json
 */
function yearlyDataPath(guildId, store, y) {
  return `${guildId}/keihi/${store}/${y}/${y}.json`;
}

// ===============================================
// グローバル経費設定の読込 / 保存
// ===============================================

const defaultGlobalConfig = {
  // 経費承認ロール（全体）
  approvalRoles: [],
  // 全体の閲覧役職
  viewRoles: [],
  // 全体の申請役職
  applyRoles: [],

  // 店舗ごとのパネル設置情報
  // storeName → channelId
  panelMap: {},
  // storeName → messageId
  panelMessageMap: {},

  // 店舗ごとの閲覧/申請ロール・経費項目
  // storeName → roleIds[]
  threadViewRolesByStore: {},
  applyRolesByStore: {},
  // storeName → ["家賃", "広告費", ...]
  itemsByStore: {},

  // 設定パネルメッセージ位置
  // { channelId, messageId }
  settingPanel: null,

  lastUpdated: null,
};

/**
 * グローバル経費設定を読み込み
 * @param {string} guildId
 * @returns {Promise<object>}
 */
async function loadKeihiConfig(guildId) {
  const path = globalConfigPath(guildId);

  try {
    const data = (await readJSON(path)) || {};
    return {
      ...defaultGlobalConfig,
      ...data,
      approvalRoles: Array.isArray(data.approvalRoles) ? data.approvalRoles : [],
      viewRoles: Array.isArray(data.viewRoles) ? data.viewRoles : [],
      applyRoles: Array.isArray(data.applyRoles) ? data.applyRoles : [],
      panelMap: data.panelMap || {},
      panelMessageMap: data.panelMessageMap || {},
      threadViewRolesByStore: data.threadViewRolesByStore || {},
      applyRolesByStore: data.applyRolesByStore || {},
      itemsByStore: data.itemsByStore || {},
      settingPanel: data.settingPanel || null,
      lastUpdated: data.lastUpdated || null,
    };
  } catch (err) {
    logger.error('[keihiConfig] グローバル設定読込エラー:', err);
    return { ...defaultGlobalConfig };
  }
}

/**
 * グローバル経費設定を保存
 * @param {string} guildId
 * @param {object} config
 */
async function saveKeihiConfig(guildId, config) {
  const path = globalConfigPath(guildId);

  try {
    const data = {
      ...defaultGlobalConfig,
      ...config,
      lastUpdated: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    await saveJSON(path, data);
    return true;
  } catch (err) {
    logger.error('[keihiConfig] グローバル設定保存エラー:', err);
    return false;
  }
}

// ===============================================
// 店舗別 設定の読込 / 保存
// ===============================================

const defaultStoreConfig = {
  // この店舗専用の閲覧/申請ロールや経費項目を
  // 必要があればここに持たせる
  threadViewRoles: [],
  applyRoles: [],
  items: [],
  lastUpdated: null,
};

/**
 * 店舗別設定の読込
 * GCS/ギルドID/keihi/店舗名/config.json
 */
async function loadStoreKeihiConfig(guildId, store) {
  const path = storeConfigPath(guildId, store);

  try {
    const data = (await readJSON(path)) || {};
    return {
      ...defaultStoreConfig,
      ...data,
      threadViewRoles: Array.isArray(data.threadViewRoles) ? data.threadViewRoles : [],
      applyRoles: Array.isArray(data.applyRoles) ? data.applyRoles : [],
      items: Array.isArray(data.items) ? data.items : [],
      lastUpdated: data.lastUpdated || null,
    };
  } catch (err) {
    logger.error('[keihiConfig] 店舗別設定読込エラー:', err);
    return { ...defaultStoreConfig };
  }
}

/**
 * 店舗別設定の保存
 */
async function saveStoreKeihiConfig(guildId, store, config) {
  const path = storeConfigPath(guildId, store);

  try {
    const data = {
      ...defaultStoreConfig,
      ...config,
      lastUpdated: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
    await saveJSON(path, data);
    return true;
  } catch (err) {
    logger.error('[keihiConfig] 店舗別設定保存エラー:', err);
    return false;
  }
}

// ===============================================
// 経費データ保存（とりあえず日別）
// ===============================================

/**
 * 日別経費データを追加保存
 * GCS/ギルドID/keihi/店舗名/年/月/日/年月日.json
 * @param {string} guildId
 * @param {string} store
 * @param {object} entry
 * @returns {Promise<boolean>}
 */
async function saveDailyKeihi(guildId, store, entry) {
  const now = dayjs();
  const y = now.format('YYYY');
  const m = now.format('MM');
  const d = now.format('DD');

  const filePath = dailyDataPath(guildId, store, y, m, d);

  try {
    let list = [];

    if (await exists(filePath)) {
      const old = await readJSON(filePath);
      if (Array.isArray(old)) list = old;
    }

    list.push({
      ...entry,
      timestamp: now.toISOString(),
    });

    await saveJSON(filePath, list);
    return true;
  } catch (err) {
    logger.error('[keihiConfig] 日別データ保存エラー:', err);
    return false;
  }
}

// ===============================================
// Export
// ===============================================
module.exports = {
  // パス関連
  globalConfigPath,
  storeConfigPath,
  dailyDataPath,
  monthlyDataPath,
  yearlyDataPath,

  // グローバル設定
  loadKeihiConfig,
  saveKeihiConfig,

  // 店舗別設定
  loadStoreKeihiConfig,
  saveStoreKeihiConfig,

  // 経費報告データ（日別）
  saveDailyKeihi,
};
