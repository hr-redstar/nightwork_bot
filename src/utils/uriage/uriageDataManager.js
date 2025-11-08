// src/utils/uriage/uriageDataManager.js
const dayjs = require('dayjs');
const logger = require('../logger');
const { readJSON, saveJSON } = require('../gcs');

/**
 * 売上設定ファイルのパスを生成
 * @param {string} guildId
 */
function configPath(guildId) {
  return `GCS/${guildId}/uriage/config.json`;
}

/**
 * 日次売上データファイルのパスを生成
 * @param {string} guildId
 * @param {string} storeName
 * @param {string} date - 'YYYY-MM-DD' or 'YYYY/MM/DD' format
 */
function dailyDataPath(guildId, storeName, date) {
  const d = dayjs(date);
  if (!d.isValid()) {
    logger.error(`[uriageDataManager] 無効な日付形式です: ${date}`);
    return null;
  }
  const y = d.format('YYYY');
  const m = d.format('MM');
  const dd = d.format('DD');
  return `GCS/${guildId}/uriage/${storeName}/${y}/${m}/${y}${m}${dd}.json`;
}

/**
 * 売上設定を読み込む
 * @param {string} guildId
 */
async function loadUriageConfig(guildId) {
  const path = configPath(guildId);
  return (await readJSON(path)) || { approvalRoles: [], viewRoles: [], storeChannels: {} };
}

/**
 * 日次売上データを保存する
 * @param {string} guildId
 * @param {string} storeName
 * @param {string} date - 'YYYY-MM-DD' or 'YYYY/MM/DD' format
 * @param {object} reportData - 保存するレポートデータ
 */
async function saveDailyReport(guildId, storeName, date, reportData) {
  const path = dailyDataPath(guildId, storeName, date);
  if (!path) return;

  const dailyData = (await readJSON(path)) || [];
  dailyData.push(reportData);
  await saveJSON(path, dailyData);
}

module.exports = {
  configPath,
  dailyDataPath,
  loadUriageConfig,
  saveDailyReport,
};