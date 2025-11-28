// src/utils/uriage/uriageConfigManager.js
// ----------------------------------------------------
// 売上機能 全体設定 (GCS/<guildId>/uriage/config.json)
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

/**
 * uriage グローバル設定ファイルパス
 *   GCS/ギルドID/uriage/config.json
 */
function uriageGlobalConfigPath(guildId) {
  return `${guildId}/uriage/config.json`;
}

/**
 * ベース構造
 */
function createDefaultUriageConfig() {
  return {
    configPanel: {
      channelId: null,
      messageId: null,
    },
    approverRoleIds: [],
    panels: {}, // storeId をキーにしたパネル情報
    lastUpdated: null,
  };
}

/**
 * 売上グローバル設定の読み込み
 */
async function loadUriageConfig(guildId) {
  const path = uriageGlobalConfigPath(guildId);
  try {
    const raw = (await readJSON(path)) || {};
    const base = createDefaultUriageConfig();
    return { ...base, ...raw };
  } catch (err) {
    logger.warn(
      '[uriageConfigManager] uriage/config.json 読み込み失敗 -> デフォルト使用',
      err,
    );
    return createDefaultUriageConfig();
  }
}

/**
 * 売上グローバル設定の保存
 */
async function saveUriageConfig(guildId, config) {
  const path = uriageGlobalConfigPath(guildId);
  try {
    await saveJSON(path, config);
  } catch (err) {
    logger.error('[uriageConfigManager] uriage/config.json 保存失敗', err);
    throw err;
  }
}

module.exports = {
  uriageGlobalConfigPath,
  loadUriageConfig,
  saveUriageConfig,
};