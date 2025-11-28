// src/utils/keihi/gcsKeihiManager.js
// ----------------------------------------------------
// 経費データの GCS / ローカル保存ヘルパー
//   - 店舗ごとの config.json
//   - 日別 / 月別 / 年別 の集計・一覧
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// =====================================
// パス生成ヘルパー
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

/**
 * 店舗ごとの設定ファイル
 *   GCS/ギルドID/keihi/店舗名/config.json
 */
function keihiStoreConfigPath(guildId, storeId) {
  return `${guildId}/keihi/${storeId}/config.json`;
}

/**
 * 店舗ごとの 日別データ
 *   GCS/ギルドID/keihi/店舗名/年/月/日/年月日.json
 *   例) GCS/123456789012345678/keihi/店舗A/2025/11/25/20251125.json
 */
function keihiStoreDailyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm, dd } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}${dd}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${mm}/${dd}/${file}`;
}

/**
 * 店舗ごとの 月別データ
 *   GCS/ギルドID/keihi/店舗名/年/月/年月.json
 *   例) GCS/123456789012345678/keihi/店舗A/2025/11/202511.json
 */
function keihiStoreMonthlyPath(guildId, storeId, dateOrStr) {
  const { yyyy, mm } = resolveYmd(dateOrStr);
  const file = `${yyyy}${mm}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${mm}/${file}`;
}

/**
 * 店舗ごとの 年別データ
 *   GCS/ギルドID/keihi/店舗名/年/年.json
 *   例) GCS/123456789012345678/keihi/店舗A/2025/2025.json
 */
function keihiStoreYearlyPath(guildId, storeId, dateOrStr) {
  const { yyyy } = resolveYmd(dateOrStr);
  const file = `${yyyy}.json`;
  return `${guildId}/keihi/${storeId}/${yyyy}/${file}`;
}

// =====================================
// 読み書きラッパー
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
    viewRoleIds: [], // 閲覧役職
    requestRoleIds: [], // 申請役職
    items: [], // 経費項目（店舗別に持ちたい場合）
  };
}

/**
 * 店舗別 config.json 読み込み
 *   - 閲覧役職 / 申請役職 / パネルID などを格納想定
 */
async function loadKeihiStoreConfig(guildId, storeId) {
  const path = keihiStoreConfigPath(guildId, storeId);
  try {
    const raw = (await readJSON(path)) || {};
    const base = createDefaultStoreConfig(storeId);
    // lodash の deepmerge などを使うのが理想ですが、ここではシンプルに実装します
    raw.panel = { ...base.panel, ...(raw.panel || {}) };
    return { ...base, ...raw };
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

/**
 * 店舗・日付ごとの経費データを読み込み
 *   - 中身の構造は用途に応じて自由にしてOK
 *   - 例: { lastNo: 3, requests: [...] }
 */
async function loadKeihiDailyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreDailyPath(guildId, storeId, dateOrStr);
  try {
    return (await readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] daily 読み込み失敗: ${path}`, err);
    return {};
  }
}

/**
 * 店舗・日付ごとの経費データを保存
 */
async function saveKeihiDailyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreDailyPath(guildId, storeId, dateOrStr);
  try {
    await saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] daily 保存失敗: ${path}`, err);
    throw err;
  }
}

/**
 * 店舗・月別データ読み込み
 */
async function loadKeihiMonthlyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreMonthlyPath(guildId, storeId, dateOrStr);
  try {
    return (await readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] monthly 読み込み失敗: ${path}`, err);
    return {};
  }
}

/**
 * 店舗・月別データ保存
 */
async function saveKeihiMonthlyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreMonthlyPath(guildId, storeId, dateOrStr);
  try {
    await saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] monthly 保存失敗: ${path}`, err);
    throw err;
  }
}

/**
 * 店舗・年別データ読み込み
 */
async function loadKeihiYearlyData(guildId, storeId, dateOrStr) {
  const path = keihiStoreYearlyPath(guildId, storeId, dateOrStr);
  try {
    return (await readJSON(path)) || {};
  } catch (err) {
    logger.warn(`[gcsKeihiManager] yearly 読み込み失敗: ${path}`, err);
    return {};
  }
}

/**
 * 店舗・年別データ保存
 */
async function saveKeihiYearlyData(guildId, storeId, dateOrStr, data) {
  const path = keihiStoreYearlyPath(guildId, storeId, dateOrStr);
  try {
    await saveJSON(path, data);
  } catch (err) {
    logger.error(`[gcsKeihiManager] yearly 保存失敗: ${path}`, err);
    throw err;
  }
}

// =====================================
// 互換用の "storeData" ラッパー
//   既存コードで getKeihiStoreData(guildId, storeId)
//   みたいに使っている前提を吸収するため
//   → とりあえず「日別ファイル」にぶら下げる
// =====================================

/**
 * 互換用: 店舗単位のデータ取得
 *   - dateOrStr を指定しない場合は「今日」の daily を読む
 */
async function getKeihiStoreData(guildId, storeId, dateOrStr) {
  // 既存コードでは第3引数がないことが多いので、デフォルト = 今日
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
