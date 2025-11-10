/**
 * src/utils/kuzibiki/kuzibikiStorage.js
 */
const path = require('path');
const dayjs = require('dayjs');
const { safeReadJSON, safeSaveJSON } = require('../fileUtils');

const baseDir = path.join(__dirname, '../../../local_data/GCS');

/**
 * くじ引き設定の保存
 */
function saveKujiConfig(guildId, settings) {
  const filePath = path.join(baseDir, guildId, 'くじ引き', 'config.json');
  const data = {
    settings,
    updatedAt: new Date().toISOString(),
  };
  safeSaveJSON(filePath, data);
}

/**
 * くじ引き設定の読み込み
 */
function readKujiConfig(guildId) {
  const filePath = path.join(baseDir, guildId, 'くじ引き', 'config.json');
  return safeReadJSON(filePath) || { settings: [], updatedAt: null };
}

/**
 * くじ引き結果を日別ファイルに追記保存
 */
function saveKujiResult(guildId, resultObj) {
  const date = dayjs().format('YYYY-MM-DD');
  const filePath = path.join(baseDir, guildId, 'くじ引き', `${date}.json`);
  const existing = safeReadJSON(filePath) || [];
  existing.push(resultObj);
  safeSaveJSON(filePath, existing);
}

/**
 * 指定日の結果を読み込み
 */
function readKujiResults(guildId, date = new Date()) {
  const d = dayjs(date).format('YYYY-MM-DD');
  const filePath = path.join(baseDir, guildId, 'くじ引き', `${d}.json`);
  return safeReadJSON(filePath) || [];
}

module.exports = {
  saveKujiConfig,
  readKujiConfig,
  saveKujiResult,
  readKujiResults,
};