// src/utils/keihi/storeFolder.js
const { resolveStoreName } = require('../../handlers/keihi/setting/storeNameResolver');

// Windows/GCS両方で危険な文字を潰す
function sanitizeFolderName(name) {
  return String(name || '')
    .trim()
    .replace(/[\\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 60); // 長すぎ対策（任意）
}

/**
 * storeKey(IDでも店舗名でもOK) -> 保存用フォルダ名(店舗名)
 */
function resolveStoreFolder(storeRoleConfig, storeKey) {
  const storeName = resolveStoreName(storeRoleConfig, storeKey) || storeKey;
  return sanitizeFolderName(storeName);
}

module.exports = {
  resolveStoreFolder,
  sanitizeFolderName,
};