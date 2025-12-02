// src/utils/keihi/gcsKeihiManager.js
// ----------------------------------------------------
// 経費データの GCS / ローカル保存ヘルパー
//   - 店舗ごとの config.json
//   - 日別 / 月別 / 年別 の集計・一覧
// パス形式:
//   {guildId}/keihi/...   （GCS クライアント側で local_data/GCS を付与）
// ----------------------------------------------------

const gcs = require('../gcs');
const logger = require('../logger');
// 店舗 config のパスは keihiConfigManager 側で定義
const { keihiStoreConfigPath } = require('./keihiConfigManager');

// =====================================
// 日付ヘルパー
// =====================================

/**
 * 日付文字列または Date から {yyyy, mm, dd} を取り出す
 * - dateStr: 'YYYY-MM-DD' / 'YYYY/MM/DD' / 'YYYYMMDD'
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

  // 区切り文字を取り除く
  s = s.replace(/[\/\-]/g, '');

  if (s.length === 8) {
    const yyyy = s.slice(0, 4);
    const mm = s.slice(4, 6);
    const dd = s.slice(6, 8);
    return { yyyy, mm, dd };
  }

  // 想定外の場合は今日
  const now = new Date();
  return resolveYmd(now);
}

// =====================================
// パス生成
// =====================================

/**
 * 店舗ごとの 日別データ
 *   {guildId}/keihi/店舗名/年/月/日/年月日.json
 *   例) 123456789012345678/keihi/店舗A/2025/11/25/20251125.json
 */
function keihiStoreDailyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm, dd } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}${dd}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${mm}/${dd}/${file}`;
}

/**
 * 店舗ごとの 月別データ
 *   {guildId}/keihi/店舗名/年/月/年月.json
 */
function keihiStoreMonthlyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${mm}/${file}`;
}

/**
 * 店舗ごとの 年別データ
 *   {guildId}/keihi/店舗名/年/年.json
 */
function keihiStoreYearlyPath(guildId, storeId, dateOrStr) {
  const { yyyy } = resolveYmd(dateOrStr);
  const file = `${yyyy}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${file}`;
}

// =====================================
// 店舗 config 読み書き
// =====================================

/**
 * 店舗別 config のデフォルトを生成
 */
function createDefaultStoreConfig(storeId) {
  return {
    storeId,
    panel: {
      channelId: null,
      messageId: null, // 経費申請パネルのメッセージID
    },
    viewRoleIds: [],    // 閲覧役職 (ロールID配列)
    requestRoleIds: [], // 申請役職 (ロールID配列)
    items: [],          // 経費項目（店舗別に持ちたい場合）
  };
}

/**
 * 店舗別 config.json 読み込み
 *   - 閲覧役職 / 申請役職 / パネルID など
 */
async function loadKeihiStoreConfig(guildId, storeId) {
  const path = keihiStoreConfigPath(guildId, storeId);
  try {
    const raw = (await gcs.readJSON(path)) || {};
    const base = createDefaultStoreConfig(storeId);

    const panel = { ...base.panel, ...(raw.panel || {}) };

    return {
      ...base,
      ...raw,
      panel,
    };
  } catch (err) {
    logger.warn(
      `[gcsKeihiManager] store config 読み込み失敗: ${path} → デフォルトを返します`,
      err,
    );
    return createDefaultStoreConfig(storeId);
  }
}

/**
 * @deprecated 代わりに loadKeihiStoreConfig を使用してください
 */
async function loadStoreConfig(guildId, storeId) {
  logger.warn(
    '[gcsKeihiManager] loadStoreConfig は非推奨です。loadKeihiStoreConfig を使用してください。',
  );
  return loadKeihiStoreConfig(guildId, storeId);
}

/**
 * 店舗別 config.json 保存
 */
async function saveKeihiStoreConfig(guildId, storeId, data) {
  const path = keihiStoreConfigPath(guildId, storeId);
  const base = createDefaultStoreConfig(storeId);

  const saveData = {
    ...base,
    ...data,
    panel: {
      ...base.panel,
      ...(data.panel || {}),
    },
    lastUpdated: new Date().toISOString(),
  };

  try {
    await gcs.saveJSON(path, saveData);
  } catch (err) {
    logger.error(`[gcsKeihiManager] store config 保存失敗: ${path}`, err);
    throw err;
  }
}

/**
 * @deprecated 代わりに saveKeihiStoreConfig を使用してください
 */
async function saveStoreConfig(guildId, storeId, config) {
  return saveKeihiStoreConfig(guildId, storeId, config);
}

// =====================================
// 日 / 月 / 年 データ
// =====================================

async function loadKeihiDailyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreDailyPath(guildId, storeId, dateOrStr);
  try {
    return (await gcs.readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] daily 読み込み失敗: ${path}`, err);
    return {};
  }
}

async function saveKeihiDailyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreDailyPath(guildId, storeId, dateOrStr);
  logger.debug(`[gcsKeihiManager] 日別データを保存: ${path}`);
  try {
    await gcs.saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] daily 保存失敗: ${path}`, err);
    throw err;
  }
}

async function loadKeihiMonthlyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreMonthlyPath(guildId, storeId, dateOrStr);
  try {
    return (await gcs.readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] monthly 読み込み失敗: ${path}`, err);
    return {};
  }
}

async function saveKeihiMonthlyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreMonthlyPath(guildId, storeId, dateOrStr);
  logger.debug(`[gcsKeihiManager] 月別データを保存: ${path}`);
  try {
    await gcs.saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] monthly 保存失敗: ${path}`, err);
    throw err;
  }
}

async function loadKeihiYearlyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreYearlyPath(guildId, storeId, dateOrStr);
  try {
    return (await gcs.readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] yearly 読み込み失敗: ${path}`, err);
    return {};
  }
}

async function saveKeihiYearlyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreYearlyPath(guildId, storeId, dateOrStr);
  logger.debug(`[gcsKeihiManager] 年別データを保存: ${path}`);
  try {
    await gcs.saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] yearly 保存失敗: ${path}`, err);
    throw err;
  }
}

// =====================================
// 既存コード互換ラッパー
// =====================================

/**
 * 互換用: 店舗単位のデータ取得
 *   - dateOrStr を指定しない場合は「今日」の daily を読む
 */
async function getKeihiStoreData(guildId, storeId, dateOrStr) {
  return loadKeihiDailyData(guildId, storeId, dateOrStr);
}

/**
 * 互換用: 店舗単位のデータ保存
 */
async function saveKeihiStoreData(guildId, storeId, data, dateOrStr) {
  return saveKeihiDailyData(guildId, storeId, dateOrStr, data);
}

module.exports = {
  // パス生成
  keihiStoreConfigPath,
  keihiStoreDailyPath,
  keihiStoreMonthlyPath,
  keihiStoreYearlyPath,

  // 店舗 config
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
  createDefaultStoreConfig,
  // 後方互換性のため（いずれ削除）
  loadStoreConfig,
  saveStoreConfig,

  // 日/月/年 データ
  loadKeihiDailyData,
  saveKeihiDailyData,
  loadKeihiMonthlyData,
  saveKeihiMonthlyData,
  loadKeihiYearlyData,
  saveKeihiYearlyData,

  // 既存コード互換
  getKeihiStoreData,
  saveKeihiStoreData,
};
