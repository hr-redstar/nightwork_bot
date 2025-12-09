// src/utils/uriage/gcsUriageSettingManager.js
// 設定用のパスヘルパー（必要最低限）

const path = require('path');

function getUriageSettingPath(guildId) {
  return path.join('GCS', guildId, 'uriage', 'config.json');
}

function getUriageStoreSettingPath(guildId, storeName) {
  return path.join('GCS', guildId, 'uriage', storeName, 'config.json');
}

module.exports = {
  getUriageSettingPath,
  getUriageStoreSettingPath,
};
