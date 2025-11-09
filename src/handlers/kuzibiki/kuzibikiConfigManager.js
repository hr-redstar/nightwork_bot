/**
 * src/handlers/kuzibiki/kuzibikiConfigManager.js
 * くじ引き機能の設定ファイルを管理
 */
const { GcsFile } = require('../../utils/gcs/gcsFile');

const CONFIG_PATH = (guildId) => `kuzibiki/${guildId}/config.json`;

/**
 * くじ引き設定を取得
 * @param {string} guildId
 * @returns {Promise<object>}
 */
async function getKuzibikiConfig(guildId) {
  const file = new GcsFile(CONFIG_PATH(guildId));
  const config = await file.readJson();
  return config || {};
}

/**
 * くじ引き設定を保存
 * @param {string} guildId
 * @param {object} config
 */
async function saveKuzibikiConfig(guildId, config) {
  const file = new GcsFile(CONFIG_PATH(guildId));
  await file.saveJson(config);
}

module.exports = { getKuzibikiConfig, saveKuzibikiConfig };