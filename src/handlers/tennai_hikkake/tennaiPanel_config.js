// src/handlers/tennai_hikkake/tennaiPanel_config.js

// サンプル：実際はDBやJSONから取得する想定
const storesConfig = [
  { name: '店舗A', channelId: '123456789012345678' },
  { name: '店舗B', channelId: '234567890123456789' },
  { name: '店舗C', channelId: '345678901234567890' },
];

function getStoreChannelId(storeName) {
  const store = storesConfig.find(s => s.name === storeName);
  return store ? store.channelId : null;
}

function getAllStores() {
  return storesConfig;
}

module.exports = { getStoreChannelId, getAllStores };