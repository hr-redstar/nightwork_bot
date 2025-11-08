/**
 * src/handlers/KPI/KPIThreadLogger.js
 * KPI目標・申請ログをスレッドに出力
 */

const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const logger = require('../../utils/logger');

/**
 * 指定店舗のログスレッドを取得または新規作成
 * @param {TextChannel} channel 
 * @param {'target'|'report'} type 
 * @param {string} storeName 
 * @returns {Promise<ThreadChannel>}
 */
async function getOrCreateThread(channel, type, storeName) {
  const guildId = channel.guild.id;
  const config = (await getGuildConfig(guildId)) || {};
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};

  const key = type === 'target' ? 'targetThreadId' : 'reportThreadId';
  const existingId = config.KPI[storeName][key];

  // 既存スレッド再利用
  if (existingId) {
    try {
      const thread = await channel.threads.fetch(existingId);
      if (thread) return thread;
    } catch {
      logger.warn(`⚠️ スレッドが存在しないため新規作成: ${storeName}`);
    }
  }

  // 新規作成
  const name =
    type === 'target'
      ? `📊 KPI目標設定-ログ-${storeName}`
      : `🧾 KPI申請-ログ-${storeName}`;

  const thread = await channel.threads.create({
    name,
    reason: `${name} の自動生成`,
  });

  config.KPI[storeName][key] = thread.id;
  await setGuildConfig(guildId, config);
  logger.info(`🧵 KPIログスレッド作成: ${name}`);

  return thread;
}

/**
 * スレッドへEmbedを送信
 */
async function sendKpiLogToThread(channel, type, storeName, author, embed) {
  try {
    const thread = await getOrCreateThread(channel, type, storeName);
    await thread.send({
      content: `🪵 **${author}** が${type === 'target' ? 'KPI目標値' : 'KPI申請'}を更新しました。`,
      embeds: [embed],
    });
  } catch (err) {
    logger.error('❌ KPIログ送信エラー:', err);
  }
}

module.exports = { sendKpiLogToThread };
