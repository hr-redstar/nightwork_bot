// src/utils/uriage/gcsUriageConfigManager.js
// ----------------------------------------------------
// 売上設定の GCS 管理ラッパー
// 既存の uriageConfigManager をそのまま再エクスポートし、
// 将来的にパス仕様を切り替えたい場合にもここで吸収できるようにする。
// ----------------------------------------------------

const {
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('./uriageConfigManager');

/**
 * 設定パネル情報を更新（互換用）
 * @param {string} guildId
 * @param {{channelId: string, messageId: string}} panelInfo
 */
async function setSettingPanelInfo(guildId, panelInfo) {
  const config = await loadUriageConfig(guildId);
  config.configPanel = panelInfo;
  await saveUriageConfig(guildId, config);
  return config;
}

/**
 * 設定パネル情報を取得（互換用）
 * @param {string} guildId
 */
async function getSettingPanelInfo(guildId) {
  const config = await loadUriageConfig(guildId);
  return config.configPanel;
}

/**
 * 承認役職を設定
 * @param {string} guildId
 * @param {string[]} roleIds
 */
async function setApproverRoles(guildId, roleIds) {
  const config = await loadUriageConfig(guildId);
  config.approverRoleIds = roleIds || [];
  await saveUriageConfig(guildId, config);
  return config;
}

/**
 * 店舗パネル情報を更新/追加
 * @param {string} guildId
 * @param {string} storeId
 * @param {object} panelData
 */
async function upsertUriagePanel(guildId, storeId, panelData) {
  const config = await loadUriageConfig(guildId);
  if (!config.panels) config.panels = {};
  config.panels[storeId] = { ...(config.panels[storeId] || {}), ...panelData };
  await saveUriageConfig(guildId, config);
  return config;
}

/**
 * パネル一覧を配列で取得
 * @param {string} guildId
 */
async function getUriagePanelList(guildId) {
  const config = await loadUriageConfig(guildId);
  return Object.values(config.panels || {});
}

module.exports = {
  loadUriageConfig,
  saveUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
  setSettingPanelInfo,
  getSettingPanelInfo,
  setApproverRoles,
  upsertUriagePanel,
  getUriagePanelList,
};
