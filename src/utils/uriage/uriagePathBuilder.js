// src/utils/uriage/uriagePathBuilder.js
// 売上のパス生成ロジック

function baseDir(guildId, store) {
  return `${guildId}/uriage/${store}`;
}

function dailyPath(guildId, store, y, m, d) {
  return `${baseDir(guildId, store)}/${y}/${m}/${d}/${y}${m}${d}.json`;
}

function monthlyPath(guildId, store, y, m) {
  return `${baseDir(guildId, store)}/${y}/${m}/${y}${m}.json`;
}

function yearlyPath(guildId, store, y) {
  return `${baseDir(guildId, store)}/${y}/${y}.json`;
}

function configPath(guildId) {
  return `${guildId}/uriage/config.json`;
}

module.exports = { baseDir, dailyPath, monthlyPath, yearlyPath, configPath };

