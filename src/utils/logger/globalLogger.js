// ----------------------------------------------------
// globalLogger.js
// グローバルログ（Discord + Slack）
// ----------------------------------------------------

const { getGuildConfig } = require('../config/gcsConfigManager');
const { sendSlackGlobalLog } = require('../config/slack/sendSlack');
const logger = require('../logger');

/**
 * ----------------------------------------------------
 * Discord にメッセージを送信する内部ヘルパー
 * ----------------------------------------------------
 */
async function _sendToDiscordGlobalLog(guild, textOrPayload) {
  const cfg = await getGuildConfig(guild.id);
  if (!cfg?.globalLogChannel) return;

  const channelId = cfg.globalLogChannel;

  let ch;
  try {
    ch = await guild.channels.fetch(channelId);
  } catch {
    return;
  }

  if (!ch || !ch.isTextBased()) return;

  try {
    await ch.send(textOrPayload);
  } catch (err) {
    logger.error('[globalLogger] Discordへのグローバルログ送信エラー:', err);
  }
}

/**
 * ----------------------------------------------------
 * グローバルログ（テキスト）
 * ----------------------------------------------------
 * @param {Guild} guild
 * @param {string} text
 */
async function sendGlobalLog(guild, text) {
  try {
    // ① Discord へ送信
    await _sendToDiscordGlobalLog(guild, text);

    // ② Slackへ送信（グローバルログのみ）
    await sendSlackGlobalLog(guild.id, text);

    logger.info(`[globalLogger] GlobalLog sent from ${guild.name}`);
  } catch (err) {
    logger.error('[globalLogger] sendGlobalLog エラー:', err);
  }
}

/**
 * ----------------------------------------------------
 * グローバルログ（Embed）
 * ----------------------------------------------------
 * @param {Guild} guild
 * @param {EmbedBuilder} embed
 */
async function sendGlobalEmbed(guild, embed) {
  try {
    const payload = { embeds: [embed] };

    // ① Discord送信
    await _sendToDiscordGlobalLog(guild, payload);

    // ② Slack送信は “テキストのみ” と仕様があるので embed は text 化する
    const plain = embed.data?.description ||
                  embed.data?.title ||
                  '[Embed Log]';

    await sendSlackGlobalLog(guild.id, plain);

    logger.info(`[globalLogger] GlobalEmbed sent from ${guild.name}`);
  } catch (err) {
    logger.error('[globalLogger] sendGlobalEmbed エラー:', err);
  }
}

module.exports = {
  sendGlobalLog,
  sendGlobalEmbed,
};
