// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定およびデータパス管理
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger'); // loggerをインポート
const { readJSON, saveJSON } = require('../gcs');

// ====================================================
// 🧭 パス生成ロジック（keihiPathBuilder統合）
// ====================================================

function dailyPath(guildId, store, y, m, d) {
  return `GCS/${guildId}/keihi/${store}/${y}/${m}/${d}/${y}${m}${d}.json`;
}

function configPath(guildId) {
  return `GCS/${guildId}/keihi/config.json`;
}

// ====================================================
// ⚙️ 設定ファイルの読み書き
// ====================================================

/**
 * 経費設定ファイルを読み込む
 */
async function loadKeihiConfig(guildId) {
  try {
    const filePath = configPath(guildId);
    const data = await readJSON(filePath);
    return data || { roles: {}, stores: {}, storeItems: {} };
  } catch (err) {
    logger.error(`❌ 経費設定読込エラー(${guildId}):`, err);
    return {
      roles: { approval: null, view: null, request: null },
      stores: {},
      storeItems: {},
    };
  }
}

/**
 * 経費設定ファイルを保存する
 */
async function saveKeihiConfig(guildId, config) {
  try {
    const filePath = configPath(guildId);
    await saveJSON(filePath, config);
  } catch (err) {
    logger.error(`❌ 経費設定保存エラー(${guildId}):`, err);
  }
}

/**
 * 経費設定を部分更新
 */
async function updateKeihiConfig(guildId, updates) {
  const config = await loadKeihiConfig(guildId);
  const newConfig = { ...config, ...updates };
  await saveKeihiConfig(guildId, newConfig);
  return newConfig;
}

// ====================================================
// 💾 日次・月次・年次データ保存ユーティリティ
// ====================================================

/**
 * 日次データを保存（例：2025/11/08/20251108.json）
 */
async function saveKeihiDaily(guildId, store, data, overwrite = false) {
  try {
    const dateStr = Array.isArray(data) ? data[0]?.date : data.date;
    const d = dayjs(dateStr);
    const y = d.isValid() ? d.format('YYYY') : dayjs().format('YYYY');
    const m = d.isValid() ? d.format('MM') : dayjs().format('MM');
    const dd = d.isValid() ? d.format('DD') : dayjs().format('DD');
    const filePath = dailyPath(guildId, store, y, m, dd);

    let arr = data;
    if (!overwrite) {
      arr = (await readJSON(filePath)) || [];
      arr.push(data);
    }

    await saveJSON(filePath, arr);
    // ログ出力はgcs.js側で処理されるため、ここでは不要
  } catch (err) {
    logger.error('❌ 経費日次保存エラー:', err);
  }
}

/**
 * 日次データを読み込む
 */
async function readKeihiDaily(guildId, store, y, m, d) {
  const filePath = dailyPath(guildId, store, y, m, d);
  return (await readJSON(filePath)) || [];
}

// ====================================================
// 📦 エクスポート
// ====================================================

module.exports = {
  configPath,
  loadKeihiConfig,
  saveKeihiConfig,
  updateKeihiConfig,
  saveKeihiDaily,
  readKeihiDaily,
};
