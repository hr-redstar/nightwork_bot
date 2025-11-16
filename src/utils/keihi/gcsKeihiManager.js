// src/utils/keihi/gcsKeihiManager.js
const { readJson, writeJson, listFiles } = require('../gcs');
const path = require('path');

/**
 * 経費設定データを取得
 */
async function getKeihiConfig(guildId) {
  return (await readJson(`GCS/${guildId}/keihi/config.json`)) || {};
}

/**
 * 経費設定データを保存
 */
async function saveKeihiConfig(guildId, data) {
  await writeJson(`GCS/${guildId}/keihi/config.json`, {
    ...data,
    updatedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
  });
}

/**
 * 経費パネル設置一覧を取得
 */
async function getKeihiPanelList(guildId) {
  // panelList はJSONオブジェクト内の配列と想定される（例: { list: [] }）
  // 二重にラップされたペイロードにも対応する（例: { list: { list: [...] } }）
  const data = await readJson(`GCS/${guildId}/keihi/panelList.json`);
  const raw = data?.list;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.list && Array.isArray(raw.list)) return raw.list;
  return [];
}

/**
 * 経費パネル設置一覧を保存
 */
async function saveKeihiPanelList(guildId, list) {
  await writeJson(`GCS/${guildId}/keihi/panelList.json`, { list });
}

/**
 * 指定店舗のCSVファイル一覧を取得
 */
async function getCsvFileList(guildId, store) {
  const prefix = `GCS/${guildId}/keihi/${store}/`;
  const allFiles = await listFiles(prefix);
  return allFiles.filter(f => f.endsWith('.csv')).map(f => path.basename(f));
}

module.exports = {
  getKeihiConfig,
  saveKeihiConfig,
  getKeihiPanelList,
  saveKeihiPanelList,
  getCsvFileList,
};