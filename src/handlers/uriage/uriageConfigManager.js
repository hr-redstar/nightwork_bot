/**
 * src/handlers/uriage/uriageConfigManager.js
 * 売上機能の設定ファイルを管理
 */
const path = require('path');
const { safeReadJSON, safeSaveJSON } = require('../../utils/fileUtils');

const baseDir = path.join(__dirname, '../../../local_data/GCS');

/**
 * 売上設定を取得
 * @param {string} guildId
 * @returns {object}
 */
function getUriageConfig(guildId) {
  const filePath = path.join(baseDir, guildId, 'uriage', 'config.json');
  return safeReadJSON(filePath) || {};
}

/**
 * 売上設定を保存
 * @param {string} guildId
 * @param {object} config
 */
function saveUriageConfig(guildId, config) {
  const filePath = path.join(baseDir, guildId, 'uriage', 'config.json');
  safeSaveJSON(filePath, config);
}

module.exports = { getUriageConfig, saveUriageConfig };