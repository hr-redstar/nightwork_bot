// src/utils/uriage/gcsUriageReportManager.js
// 売上報告データの読み書きスタブ

const { saveJSON, readJSON } = require('../gcs');
const { getDailyJsonPath } = require('./gcsUriageManager');

async function loadUriageDaily(guildId, storeName, dateLabel) {
  const p = getDailyJsonPath(guildId, storeName, dateLabel);
  return (await readJSON(p)) || {};
}

async function saveUriageDaily(guildId, storeName, dateLabel, data) {
  const p = getDailyJsonPath(guildId, storeName, dateLabel);
  await saveJSON(p, data || {});
  return data;
}

module.exports = { loadUriageDaily, saveUriageDaily };
