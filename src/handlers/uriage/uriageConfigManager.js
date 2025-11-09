/**
 * src/handlers/uriage/uriageConfigManager.js
 * 売上機能の設定ファイルを管理
 */
const { GcsFile } = require('../../utils/gcs/gcsFile');

const CONFIG_PATH = (guildId) => `uriage/${guildId}/config.json`;

/**
 * 売上設定を取得
 * @param {string} guildId
 * @returns {Promise<object>}
 */
async function getUriageConfig(guildId) {
  const file = new GcsFile(CONFIG_PATH(guildId));
  const config = await file.readJson();
  return config || {};
}

/**
 * 売上設定を保存
 * @param {string} guildId
 * @param {object} config
 */
async function saveUriageConfig(guildId, config) {
  const file = new GcsFile(CONFIG_PATH(guildId));
  await file.saveJson(config);
}

module.exports = { getUriageConfig, saveUriageConfig };