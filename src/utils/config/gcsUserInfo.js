// src/utils/config/gcsUserInfo.js
// ユーザー情報関連のGCSヘルパー
const gcs = require('../gcs');

function userInfoPath(guildId, userId) {
  return `${guildId}/ユーザー情報/${userId}.json`;
}

async function readUserInfo(guildId, userId) {
  return (await gcs.readJSON(userInfoPath(guildId, userId))) || {};
}

async function writeUserInfo(guildId, userId, data) {
  await gcs.writeJSON(userInfoPath(guildId, userId), data || {});
}

module.exports = {
  userInfoPath,
  readUserInfo,
  writeUserInfo,
};

