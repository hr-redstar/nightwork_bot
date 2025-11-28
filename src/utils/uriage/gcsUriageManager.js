// src/utils/uriage/gcsUriageManager.js
// ----------------------------------------------------
// 売上データの GCS / ローカル保存ヘルパー
// ----------------------------------------------------

const { readJSON, saveJSON, readFile, writeFile, listFiles } = require('../gcs');
const logger = require('../logger');

//------------------------------------------------------------
// 🔹 パス生成ヘルパー
//------------------------------------------------------------

/**
 * 日付文字列または Date から {yyyy, mm, dd} を取り出す
 */
function resolveYmd(dateOrStr) {
  if (dateOrStr instanceof Date) {
    const yyyy = dateOrStr.getFullYear();
    const mm = String(dateOrStr.getMonth() + 1).padStart(2, '0');
    const dd = String(dateOrStr.getDate()).padStart(2, '0');
    return { yyyy, mm, dd };
  }

  let s = String(dateOrStr || '').trim();
  if (!s) {
    const now = new Date();
    return resolveYmd(now);
  }

  s = s.replace(/[\/\-]/g, '');

  if (s.length === 8) {
    const yyyy = s.slice(0, 4);
    const mm = s.slice(4, 6);
    const dd = s.slice(6, 8);
    return { yyyy, mm, dd };
  }

  const now = new Date();
  return resolveYmd(now);
}

/**
 * 店舗ごとの設定ファイル
 *   GCS/ギルドID/uriage/店舗名/config.json
 */
function uriageStoreConfigPath(guildId, storeId) {
  return `${guildId}/uriage/${storeId}/config.json`;
}

/**
 * 店舗ごとの 日別データ
 *   GCS/ギルドID/uriage/店舗名/年/月/日/年月日.json
 */
function uriageStoreDailyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm, dd } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}${dd}.json`;
  return `${guildId}/uriage/${storeId}/${yyyy}/${mm}/${dd}/${file}`;
}

/**
 * 店舗ごとの 月別データ
 *   GCS/ギルドID/uriage/店舗名/年/月/年月.json
 */
function uriageStoreMonthlyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}.json`;
  return `${guildId}/uriage/${storeId}/${yyyy}/${mm}/${file}`;
}

/**
 * 店舗ごとの 年別データ
 *   GCS/ギルドID/uriage/店舗名/年/年.json
 */
function uriageStoreYearlyPath(guildId, storeId, dateOrStr) {
  const { yyyy } = resolveYmd(dateOrStr);
  const file = `${yyyy}.json`;
  return `${guildId}/uriage/${storeId}/${yyyy}/${file}`;
}

//------------------------------------------------------------
// 🔹 読み書きラッパー
//------------------------------------------------------------

/**
 * 店舗別 config のデフォルトを生成
 */
function createDefaultStoreConfig(storeId) {
  return {
    storeId,
    panel: {
      channelId: null,
      messageId: null,
    },
    viewRoleIds: [],
    requestRoleIds: [],
    items: [], // 売上項目
  };
}

/**
 * 店舗別 config.json 読み込み
 */
async function loadUriageStoreConfig(guildId, storeId) {
  const path = uriageStoreConfigPath(guildId, storeId);
  try {
    const raw = (await readJSON(path)) || {};
    const base = createDefaultStoreConfig(storeId);
    raw.panel = { ...base.panel, ...(raw.panel || {}) };
    return { ...base, ...raw };
  } catch (err) {
    logger.warn(
      `[gcsUriageManager] store config 読み込み失敗: ${path} → デフォルトを返します`,
      err,
    );
    return createDefaultStoreConfig(storeId);
  }
}

/**
 * 店舗別 config.json 保存
 */
async function saveUriageStoreConfig(guildId, storeId, data) {
  const path = uriageStoreConfigPath(guildId, storeId);
  const saveData = {
    ...createDefaultStoreConfig(storeId),
    ...data,
    panel: {
      ...createDefaultStoreConfig(storeId).panel,
      ...(data.panel || {}),
    },
    lastUpdated: new Date().toISOString(),
  };
  try {
    await saveJSON(path, saveData);
  } catch (err) {
    logger.error(`[gcsUriageManager] store config 保存失敗: ${path}`, err);
    throw err;
  }
}

/**
 * 店舗・日付ごとの売上データを読み込み
 */
async function loadUriageDailyData(guildId, storeId, dateOrStr) {
  const path = uriageStoreDailyPath(guildId, storeId, dateOrStr);
  try {
    return (await readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsUriageManager] daily 読み込み失敗: ${path}`, err);
    return {};
  }
}

/**
 * 店舗・日付ごとの売上データを保存
 */
async function saveUriageDailyData(guildId, storeId, dateOrStr, data) {
  const path = uriageStoreDailyPath(guildId, storeId, dateOrStr);
  try {
    await saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsUriageManager] daily 保存失敗: ${path}`, err);
    throw err;
  }
}

module.exports = {
  // パス生成
  uriageStoreConfigPath,
  uriageStoreDailyPath,
  uriageStoreMonthlyPath,
  uriageStoreYearlyPath,

  // 店舗 config
  loadUriageStoreConfig,
  saveUriageStoreConfig,
  createDefaultStoreConfig,

  // 日別データ
  loadUriageDailyData,
  saveUriageDailyData,
};
