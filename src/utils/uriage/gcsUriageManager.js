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

// ---------- 新 API: daily/monthly/yearly の読み書き ----------
async function loadUriageDailyData(guildId, dateStr) {
  const path = `${guildId}/uriage/daily/${dateStr}.json`;
  try {
    const raw = (await readJSON(path)) || [];
    return Array.isArray(raw) ? raw : raw.records ?? [];
  } catch (err) {
    logger.warn(`[gcsUriageManager] loadUriageDailyData 失敗: ${path}`, err);
    return [];
  }
}

async function saveUriageDailyData(guildId, dateStr, records) {
  const path = `${guildId}/uriage/daily/${dateStr}.json`;
  await saveJSON(path, records);
}

async function loadUriageMonthlyData(guildId, yyyymm) {
  const path = `${guildId}/uriage/monthly/${yyyymm}.json`;
  try {
    const raw = (await readJSON(path)) || [];
    return Array.isArray(raw) ? raw : raw.records ?? [];
  } catch (err) {
    logger.warn(`[gcsUriageManager] loadUriageMonthlyData 失敗: ${path}`, err);
    return [];
  }
}

async function saveUriageMonthlyData(guildId, yyyymm, records) {
  const path = `${guildId}/uriage/monthly/${yyyymm}.json`;
  await saveJSON(path, records);
}

async function loadUriageYearlyData(guildId, yyyy) {
  const path = `${guildId}/uriage/yearly/${yyyy}.json`;
  try {
    const raw = (await readJSON(path)) || [];
    return Array.isArray(raw) ? raw : raw.records ?? [];
  } catch (err) {
    logger.warn(`[gcsUriageManager] loadUriageYearlyData 失敗: ${path}`, err);
    return [];
  }
}

async function saveUriageYearlyData(guildId, yyyy, records) {
  const path = `${guildId}/uriage/yearly/${yyyy}.json`;
  await saveJSON(path, records);
}

// ---------- 新 API: appendUriageRecord（daily/monthly/yearly を同時に更新） ----------
function getYyyyMmFromDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 2) return null;
  const [yyyy, mm] = parts;
  return `${yyyy}${mm}`;
}

function getYyyyFromDate(dateStr) {
  if (!dateStr) return null;
  const [yyyy] = dateStr.split('-');
  return yyyy;
}

async function appendUriageRecord(guildId, record) {
  const { date } = record;
  if (!date) {
    logger.warn('[gcsUriageManager] appendUriageRecord: date が未定義');
    return;
  }

  const yyyymm = getYyyyMmFromDate(date);
  const yyyy = getYyyyFromDate(date);

  // daily
  const daily = await loadUriageDailyData(guildId, date);
  daily.push(record);
  await saveUriageDailyData(guildId, date, daily);

  // monthly
  if (yyyymm) {
    const monthly = await loadUriageMonthlyData(guildId, yyyymm);
    monthly.push(record);
    await saveUriageMonthlyData(guildId, yyyymm, monthly);
  }

  // yearly
  if (yyyy) {
    const yearly = await loadUriageYearlyData(guildId, yyyy);
    yearly.push(record);
    await saveUriageYearlyData(guildId, yyyy, yearly);
  }
}

/**
 * 売上レコードを1件更新する
 *  - 日別 / 月別 / 年別 の全てを同じ内容で更新
 * @param {string} guildId
 * @param {string} dateStr   - "YYYY-MM-DD"
 * @param {string} recordId  - 保存時の record.id（今回は threadMessage.id）
 * @param {object} patch     - 上書きしたいプロパティ（{ status: 'approved', ... } など）
 */
async function updateUriageRecord(guildId, dateStr, recordId, patch) {
  const yyyymm = getYyyyMmFromDate(dateStr);
  const yyyy = getYyyyFromDate(dateStr);

  const applyPatch = (records) => {
    if (!Array.isArray(records)) return records;

    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) return records;

    const old = records[idx] || {};
    records[idx] = { ...old, ...patch };
    return records;
  };

  // 日別
  const daily = await loadUriageDailyData(guildId, dateStr);
  const dailyPatched = applyPatch(daily);
  await saveUriageDailyData(guildId, dateStr, dailyPatched);

  // 月別
  if (yyyymm) {
    const monthly = await loadUriageMonthlyData(guildId, yyyymm);
    const monthlyPatched = applyPatch(monthly);
    await saveUriageMonthlyData(guildId, yyyymm, monthlyPatched);
  }

  // 年別
  if (yyyy) {
    const yearly = await loadUriageYearlyData(guildId, yyyy);
    const yearlyPatched = applyPatch(yearly);
    await saveUriageYearlyData(guildId, yyyy, yearlyPatched);
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
  // 新 API
  loadUriageDailyData,
  saveUriageDailyData,
  loadUriageMonthlyData,
  saveUriageMonthlyData,
  loadUriageYearlyData,
  saveUriageYearlyData,
  appendUriageRecord,
};
