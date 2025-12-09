// src/utils/uriage/uriageCsvManager.js
// 売上データのCSV生成スタブ

const { saveBuffer, getPublicUrl } = require('../gcs');
const path = require('path');

function buildCsvPath(guildId, storeName, label) {
  return path.join('GCS', guildId, 'uriage', storeName, 'csv', `${label}.csv`);
}

async function saveUriageCsv(guildId, storeName, label, rows) {
  const csvText = rows.map(r => r.join(',')).join('\n');
  const buf = Buffer.from(csvText, 'utf8');
  const p = buildCsvPath(guildId, storeName, label);
  await saveBuffer(p, buf);
  return { path: p, url: getPublicUrl(p) };
}

module.exports = {
  saveUriageCsv,
  buildCsvPath,
};
