// src/utils/uriage/gcsUriageManager.js
// ----------------------------------------------------
// 売上 GCS 管理（店舗別設定 / 日次・月次・年次データ）
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// 0埋め
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * YYYY-MM-DD 形式の文字列から年月日を解析
 * @param {string} dateKey 'YYYY-MM-DD'
 */
function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map((v) => parseInt(v, 10));
  return { year, month, day };
}

// -----------------------------------------
// パス生成
// -----------------------------------------
function storeBasePath(guildId, storeKey) {
  return `${guildId}/uriage/${storeKey}`;
}

/**
 * 店舗ごとの設定ファイル
 *   GCS/guildId/uriage/storeKey/config.json
 */
function storeConfigPath(guildId, storeKey) {
  return `${storeBasePath(guildId, storeKey)}/config.json`;
}

/**
 * 店舗ごとの 日別データ
 *   GCS/guildId/uriage/storeKey/年/月/日/年月日.json
 */
function uriageDailyPath(guildId, storeKey, dateKey) {
  const { year, month, day } = parseDateKey(dateKey);
  const y = year;
  const m = pad2(month);
  const d = pad2(day);
  const ymd = `${y}${m}${d}`;
  return `${storeBasePath(guildId, storeKey)}/${y}/${m}/${d}/${ymd}.json`;
}

/**
 * 店舗ごとの 月別データ
 *   GCS/guildId/uriage/storeKey/年/月/年月.json
 */
function uriageMonthlyPath(guildId, storeKey, year, month) {
  const y = year;
  const m = pad2(month);
  const ym = `${y}${m}`;
  return `${storeBasePath(guildId, storeKey)}/${y}/${m}/${ym}.json`;
}

/**
 * 店舗ごとの 年別データ
 *   GCS/guildId/uriage/storeKey/年/年.json
 */
function uriageYearlyPath(guildId, storeKey, year) {
  const y = year;
  const yy = `${y}`;
  return `${storeBasePath(guildId, storeKey)}/${y}/${yy}.json`;
}

// -----------------------------------------
// 店舗別 config
// -----------------------------------------
/**
 * 店舗別 config のデフォルトを生成
 */
function createDefaultStoreConfig(storeKey) {
  return {
    storeId: storeKey,
    reportPanelMessageId: null,
    reportPanelChannelId: null,
    viewRoleIds: [],
    requestRoleIds: [],
    items: [], // 売上項目
    lastUpdated: null,
  };
}

/**
 * 店舗別 config.json 読み込み
 */
async function loadUriageStoreConfig(guildId, storeKey) {
  const path = storeConfigPath(guildId, storeKey);
  try {
    const raw = (await readJSON(path)) || {};
    const base = createDefaultStoreConfig(storeKey);
    return { ...base, ...raw };
  } catch (err) {
    logger.error(`[gcsUriageManager] 店舗config 読み込みエラー: ${guildId}/${storeKey}`, err);
    return createDefaultStoreConfig(storeKey);
  }
}

/**
 * 店舗別 config.json 保存
 */
async function saveUriageStoreConfig(guildId, storeKey, config) {
  const data = { ...createDefaultStoreConfig(storeKey), ...config };
  data.lastUpdated = new Date().toISOString();
  try {
    await saveJSON(storeConfigPath(guildId, storeKey), data);
    return data;
  } catch (err) {
    logger.error(`[gcsUriageManager] 店舗config 保存エラー: ${guildId}/${storeKey}`, err);
    throw err;
  }
}

// -----------------------------------------
// 日次データ 追加 / 取得
// -----------------------------------------
/**
 * 日次データにレコードを追加
 * @param {string} guildId
 * @param {string} storeKey
 * @param {string} dateKey 'YYYY-MM-DD'
 * @param {object} record
 */
async function appendUriageDailyRecord(guildId, storeKey, dateKey, record) {
  const path = uriageDailyPath(guildId, storeKey, dateKey);
  try {
    const list = (await readJSON(path)) || [];
    list.push(record);
    await saveJSON(path, list);
    return list;
  } catch (err) {
    logger.error(`[gcsUriageManager] 日次売上追加エラー: ${guildId}/${storeKey}/${dateKey}`, err);
    throw err;
  }
}

async function readUriageDailyRecords(guildId, storeKey, dateKey) {
  const path = uriageDailyPath(guildId, storeKey, dateKey);
  try {
    return (await readJSON(path)) || [];
  } catch (err) {
    logger.error(`[gcsUriageManager] 日次売上読み込みエラー: ${guildId}/${storeKey}/${dateKey}`, err);
    return [];
  }
}

module.exports = {
  // パス生成
  storeBasePath,
  storeConfigPath,
  uriageDailyPath,
  uriageMonthlyPath,
  uriageYearlyPath,
  // 店舗 config
  loadUriageStoreConfig,
  saveUriageStoreConfig,
  // 日別データ
  appendUriageDailyRecord,
  readUriageDailyRecords,
};
