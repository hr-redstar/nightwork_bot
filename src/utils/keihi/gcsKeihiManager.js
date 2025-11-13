// src/utils/keihi/gcsKeihiManager.js
const { readJson, writeJson } = require('../gcs');

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
  // panelList is expected to be an array within a JSON object, e.g., { list: [] }
  const data = await readJson(`GCS/${guildId}/keihi/panelList.json`);
  return data?.list || [];
}

/**
 * 経費パネル設置一覧を保存
 */
async function saveKeihiPanelList(guildId, list) {
  await writeJson(`GCS/${guildId}/keihi/panelList.json`, { list });
}

module.exports = {
  getKeihiConfig,
  saveKeihiConfig,
  getKeihiPanelList,
  saveKeihiPanelList,
};