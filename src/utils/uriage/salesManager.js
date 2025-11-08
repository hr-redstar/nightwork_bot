// src/utils/uriage/salesManager.js
// 売上機能の設定と日次レコードの読み書き
const { saveJSON, readJSON } = require('../gcs');

const configPath = (guildId) => `GCS/${guildId}/uriage/config.json`;
const recordPath = (guildId, channelId, date) => `GCS/${guildId}/uriage/records/${channelId}/${date}.json`;

async function getSalesConfig(guildId) {
  return (await readJSON(configPath(guildId))) || {};
}

async function readSalesConfig(guildId) {
  return (await readJSON(configPath(guildId))) || {};
}

async function saveSalesConfig(guildId, data) {
  await saveJSON(configPath(guildId), data || {});
  return data || {};
}

async function loadSalesRecord(guildId, channelId, date) {
  return await readJSON(recordPath(guildId, channelId, date));
}

async function saveSalesRecord(record) {
  // record には guildId, channelId, date が必要（report/edit/approve各所でセット）
  const { guildId, channelId, date } = record || {};
  if (!guildId || !channelId || !date) return; // 必須が無ければ保存しない
  await saveJSON(recordPath(guildId, channelId, date), record);
  return record;
}

module.exports = {
  getSalesConfig,
  readSalesConfig,
  saveSalesConfig,
  loadSalesRecord,
  saveSalesRecord,
};

