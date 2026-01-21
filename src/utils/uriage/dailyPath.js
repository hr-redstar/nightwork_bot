// src/utils/daily/dailyPath.js

function toDateKey(date = new Date()) {
  if (typeof date === 'string') {
    return date.replace(/-/g, '');
  }
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function buildDailyPath({ guildId, type, storeName, dateKey }) {
  const yyyy = dateKey.slice(0, 4);
  const mm = dateKey.slice(4, 6);
  const dd = dateKey.slice(6, 8);

  return `GCS/${guildId}/${type}/${storeName}/${yyyy}/${mm}/${dd}/${dateKey}.json`;
}

module.exports = {
  toDateKey,
  buildDailyPath,
};