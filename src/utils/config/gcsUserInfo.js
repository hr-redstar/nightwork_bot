// src/utils/config/gcsUserInfo.js
// ----------------------------------------------------
// ユーザー情報（店舗 / 役職 / 生年月日 / SNS / 住所 / 備考）
// GCS または ローカル に保存するための共通ヘルパー
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// -----------------------------------------
// 保存先パス生成
// -----------------------------------------
function userInfoPath(guildId, userId) {
  return `${guildId}/ユーザー情報/${userId}.json`;
}

// -----------------------------------------
// 読み込み
// -----------------------------------------
async function readUserInfo(guildId, userId) {
  try {
    return (await readJSON(userInfoPath(guildId, userId))) || {};
  } catch (err) {
    logger.error(`[gcsUserInfo] 読み込みエラー: ${guildId}/${userId}`, err);
    return {};
  }
}

// -----------------------------------------
// 保存
// -----------------------------------------
async function writeUserInfo(guildId, userId, data) {
  try {
    await saveJSON(userInfoPath(guildId, userId), data || {});
    return true;
  } catch (err) {
    logger.error(`[gcsUserInfo] 保存エラー: ${guildId}/${userId}`, err);
    return false;
  }
}

// -----------------------------------------
// 上書き保存（部分更新）
// -----------------------------------------
async function updateUserInfo(guildId, userId, patch) {
  try {
    const current = await readUserInfo(guildId, userId);
    const updated = { ...current, ...patch };

    await saveJSON(userInfoPath(guildId, userId), updated);
    return updated;
  } catch (err) {
    logger.error(`[gcsUserInfo] 更新エラー: ${guildId}/${userId}`, err);
    return null;
  }
}

module.exports = {
  userInfoPath,
  readUserInfo,
  writeUserInfo,
  updateUserInfo,
};
