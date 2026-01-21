// src/utils/daily/dailyStore.js

const { readJSON, saveJSON } = require('../gcs');
const { toDateKey, buildDailyPath } = require('./dailyPath');

async function appendDailyRecord({
  guildId,
  type,
  storeName,
  date,
  record,
}) {
  const dateKey = toDateKey(date);

  const filePath = buildDailyPath({
    guildId,
    type,
    storeName,
    dateKey,
  });

  const daily =
    (await readJSON(filePath).catch(() => null)) ?? {
      date: dateKey,
      store: storeName,
      type,
      records: [],
    };

  daily.records.push(record);

  await saveJSON(filePath, daily);
  return daily;
}

module.exports = {
  appendDailyRecord,
};