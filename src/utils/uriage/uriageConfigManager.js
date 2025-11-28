// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上 全体設定 (ギルド単位)
//   GCS/{guildId}/uriage/config.json
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

/**
 * ベース構造
 */
function createDefaultUriageConfig() {
  return {
    // 例: { [storeId]: { channelId: '...', messageId: '...' } }
    panels: {},
    approverRoleIds: [],
    lastUpdated: null,
  };
}

// パス生成
function uriageConfigPath(guildId) {
  return `${guildId}/uriage/config.json`;
}

// 読み込み
async function loadUriageConfig(guildId) {
  try {
    const raw = (await readJSON(uriageConfigPath(guildId))) || {};
    const base = createDefaultUriageConfig();
    return { ...base, ...raw };
  } catch (err) {
    logger.error(`[uriageConfigManager] 読み込みエラー: ${guildId}`, err);
    return createDefaultUriageConfig();
  }
}

// 保存
async function saveUriageConfig(guildId, config) {
  const data = { ...createDefaultUriageConfig(), ...config };
  data.lastUpdated = new Date().toISOString();
  try {
    await saveJSON(uriageConfigPath(guildId), data);
    return data;
  } catch (err) {
    logger.error('[uriageConfigManager] uriage/config.json 保存失敗', err);
    throw err;
  }
}

module.exports = {
  uriageConfigPath,
  loadUriageConfig,
  saveUriageConfig,
};