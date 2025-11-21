// ----------------------------------------------------
// Slackへメッセージ送信（グローバルログ専用）
// ----------------------------------------------------

const axios = require('axios');
const { getGuildConfig } = require('../gcsConfigManager');

/**
 * グローバルログ送信用 Slack 送信関数
 * @param {string} guildId
 * @param {string} text
 */
async function sendSlackGlobalLog(guildId, text) {
  const config = await getGuildConfig(guildId);
  const webhook = config.slackWebhookUrl;

  if (!webhook) return; // 設定なし

  try {
    await axios.post(webhook, { text });
  } catch (err) {
    console.error('Slack送信エラー:', err.message);
  }
}

module.exports = {
  sendSlackGlobalLog,
};
