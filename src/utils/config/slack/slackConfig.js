// ----------------------------------------------------
// Slack 設定の読み書き（必要なら使用）
// ----------------------------------------------------

const { getGuildConfig, saveGuildConfig } = require('../gcsConfigManager');

async function setSlackWebhook(guildId, url) {
  const config = await getGuildConfig(guildId);
  config.slackWebhookUrl = url;
  await saveGuildConfig(guildId, config);
}

async function getSlackWebhook(guildId) {
  const config = await getGuildConfig(guildId);
  return config.slackWebhookUrl || null;
}

module.exports = {
  getSlackWebhook,
  setSlackWebhook,
};
