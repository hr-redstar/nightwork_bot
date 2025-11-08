// src/utils/uriage/gcsUriage.js
// 売上保存ヘルパー
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

const basePath = (guildId, store) => `GCS/${guildId}/uriage/${store}`;

function csvPath(guildId, store, date) {
  const d = dayjs(date);
  return `${basePath(guildId, store)}/売上報告_${d.format('YYYYMMDD')}.csv`;
}

async function saveUriageDaily(guildId, store, data, date = new Date()) {
  const d = dayjs(date);
  const p = `${basePath(guildId, store)}/${d.year()}/${d.format('MM')}/${d.format('DD')}/${d.format('YYYYMMDD')}.json`;
  await saveJSON(p, data);
}

async function readUriageConfig(guildId) {
  const p = `GCS/${guildId}/uriage/config.json`;
  return await readJSON(p);
}

module.exports = { saveUriageDaily, readUriageConfig };
module.exports.csvPath = csvPath;
