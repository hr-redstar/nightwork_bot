// src/utils/level/gcsLevel.js
const { saveJSON, readJSON } = require('../gcs');

/**
 * レベル設定を保存
 */
async function saveLevelConfig(guildId, data) {
  const path = `GCS/${guildId}/level/config.json`;
  await saveJSON(path, data);
}

/**
 * ユーザーのレベルデータを保存
 */
async function saveUserLevel(guildId, userId, data) {
  const path = `GCS/${guildId}/level/ユーザー情報/${userId}.json`;
  await saveJSON(path, data);
}

/**
 * レベル設定を読み込み
 */
async function readLevelConfig(guildId) {
  const path = `GCS/${guildId}/level/config.json`;
  return await readJSON(path);
}

/**
 * ユーザーのレベル情報を読み込み
 */
async function readUserLevel(guildId, userId) {
  const path = `GCS/${guildId}/level/ユーザー情報/${userId}.json`;
  return await readJSON(path);
}

module.exports = { saveLevelConfig, saveUserLevel, readLevelConfig, readUserLevel };

