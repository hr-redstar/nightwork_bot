// src/utils/syuttaikin/gcsSyuttaikin.js
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

const basePath = (guildId, store) => `GCS/${guildId}/syuttaikin/${store}`;

/**
 * 出退勤データを日別で保存
 */
async function saveAttendanceDaily(guildId, store, data, date = new Date()) {
  const d = dayjs(date);
  const path = `${basePath(guildId, store)}/${d.year()}/${d.format('MM')}/${d.format('DD')}/${d.format('YYYYMMDD')}.json`;
  await saveJSON(path, data);
}

/**
 * 出退勤設定を読み込み
 */
async function readAttendanceConfig(guildId) {
  const path = `GCS/${guildId}/syuttaikin/config.json`;
  return await readJSON(path);
}

module.exports = { saveAttendanceDaily, readAttendanceConfig };

