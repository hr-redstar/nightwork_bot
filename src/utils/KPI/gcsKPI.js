// src/utils/KPI/gcsKPI.js
// KPI設定保存
const { saveJSON, readJSON } = require('../gcs');

async function saveKpiConfig(guildId, data) {
  const p = `GCS/${guildId}/kpi/config.json`;
  await saveJSON(p, data);
}

async function readKpiConfig(guildId) {
  const p = `GCS/${guildId}/kpi/config.json`;
  return await readJSON(p);
}

module.exports = { saveKpiConfig, readKpiConfig };
