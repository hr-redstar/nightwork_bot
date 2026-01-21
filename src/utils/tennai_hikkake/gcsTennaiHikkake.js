// src/utils/tennai_hikkake/gcsTennaiHikkake.js
const { saveJSON, readJSON } = require('../gcs');

/**
 * 店内状況を保存
 */
async function saveTennaiStatus(guildId, store, data) {
  const path = `GCS/${guildId}/tennai_hikkake/${store}/店内状況.json`;
  await saveJSON(path, data);
}

/**
 * ひっかけ一覧を保存
 */
async function saveHikkakeList(guildId, store, data) {
  const path = `GCS/${guildId}/tennai_hikkake/${store}/ひっかけ一覧.json`;
  await saveJSON(path, data);
}

/**
 * 接客ログを保存
 */
async function saveCustomerLog(guildId, store, data) {
  const path = `GCS/${guildId}/tennai_hikkake/${store}/接客ログ.json`;
  await saveJSON(path, data);
}

/**
 * 店内状況・ひっかけ一覧を読み込み
 */
async function readTennaiData(guildId, store, file = '店内状況.json') {
  const path = `GCS/${guildId}/tennai_hikkake/${store}/${file}`;
  return await readJSON(path);
}

/**
 * 設定(config.json)を読み込み
 */
async function readHikkakeConfig(guildId) {
  const path = `GCS/${guildId}/tennai_hikkake/config.json`;
  return await readJSON(path) || {};
}

/**
 * 設定(config.json)を保存
 */
async function saveHikkakeConfig(guildId, data) {
  const path = `GCS/${guildId}/tennai_hikkake/config.json`;
  await saveJSON(path, data);
}

module.exports = { saveTennaiStatus, saveHikkakeList, saveCustomerLog, readTennaiData, saveHikkakeConfig, readHikkakeConfig };

