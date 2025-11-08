// src/utils/keihi/gcsKeihi.js
// 経費保存ヘルパー
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

const basePath = (guildId, store) => `GCS/${guildId}/keihi/${store}`;

async function saveKeihiDaily(guildId, store, data, date = new Date()) {
  const d = dayjs(date);
  const p = `${basePath(guildId, store)}/${d.year()}/${d.format('MM')}/${d.format('DD')}/${d.format('YYYYMMDD')}.json`;
  await saveJSON(p, data);
}

async function readKeihiConfig(guildId) {
  const p = `GCS/${guildId}/keihi/config.json`;
  return await readJSON(p);
}

// 互換: 既存ハンドラーが利用する関数名
async function getKeihiConfig(guildId) {
  return await readKeihiConfig(guildId);
}

async function updateKeihiData(guildId, _pathParts, data) {
  // 既存コードは第2引数を未使用で渡しているため無視し、config を保存する
  const p = `GCS/${guildId}/keihi/config.json`;
  await saveJSON(p, data || {});
}

module.exports = {
  saveKeihiDaily,
  readKeihiConfig,
  // backward-compat exports
  getKeihiConfig,
  updateKeihiData,
};
