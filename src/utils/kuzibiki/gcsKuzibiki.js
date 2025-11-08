// src/utils/kuzibiki/gcsKuzibiki.js
// くじ引き設定保存
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

async function saveKuzibikiHistory(guildId, data) {
  const d = dayjs();
  const p = `GCS/${guildId}/kuzibiki/履歴/${d.format('YYYYMMDD')}.json`;
  await saveJSON(p, data);
}

async function readKuzibikiConfig(guildId) {
  const p = `GCS/${guildId}/kuzibiki/config.json`;
  return await readJSON(p);
}

module.exports = { saveKuzibikiHistory, readKuzibikiConfig };

