// src/handlers/uriage/setting/uriagePanel_report.js
// ----------------------------------------------------
// 店舗別「売上報告パネル」を設置するヘルパー
//   - panelLocation から呼び出し
// ----------------------------------------------------

const {
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('../../../utils/uriage/gcsUriageManager');
const { buildUriageReportPanel } = require('../report/reportPanel');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');

/**
 * 店舗キーから店舗名を解決
 * @param {string} guildId
 * @param {string} storeKey
 * @returns {Promise<string>}
 */
async function resolveStoreName(guildId, storeKey) {
  const storeRoleConfig = await loadStoreRoleConfig(guildId);
  const stores = Array.isArray(storeRoleConfig?.stores)
    ? storeRoleConfig.stores
    : [];
  const hit = stores.find((s) => s.id === storeKey || s.name === storeKey);
  return hit?.name || storeKey;
}

/**
 * 売上報告パネルを送信し、店舗 config にパネル情報を保存
 * @param {Object} params
 * @param {import('discord.js').Guild} params.guild
 * @param {import('discord.js').TextChannel|import('discord.js').NewsChannel} params.channel
 * @param {string} params.storeKey
 */
async function postUriageReportPanel({ guild, channel, storeKey }) {
  const guildId = guild.id;
  const storeName = await resolveStoreName(guildId, storeKey);

  // 売上報告パネルを組み立てて送信
  const payload = buildUriageReportPanel(storeKey, storeName);
  const message = await channel.send(payload);

  // 店舗別configにパネル情報を保存
  const config = await loadUriageStoreConfig(guildId, storeKey);
  config.reportPanelMessageId = message.id;
  config.reportPanelChannelId = message.channel.id;
  await saveUriageStoreConfig(guildId, storeKey, config);

  return message;
}

module.exports = {
  postUriageReportPanel,
  resolveStoreName,
};
