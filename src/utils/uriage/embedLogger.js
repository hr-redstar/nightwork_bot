// src/utils/uriage/embedLogger.js

const { EmbedBuilder } = require('discord.js');
const { getUriageConfig } = require('./gcsUriageManager');

/**
 * 設定変更や実行ログをEmbed形式で出力する共通関数
 * @param {string} guildId - ギルドID
 * @param {object} logData - ログ内容 { title, fields }
 * @param {import('discord.js').Client} client - Discordクライアント
 */
async function sendSettingLog(guildId, logData, client) {
  try {
    const config = await getUriageConfig(guildId);
    const logChannelId = config?.logChannelId;

    if (!logChannelId) {
      console.warn(`[LOG] 売上設定ログチャンネル未設定 (${guildId})`);
      return;
    }

    // client が未指定なら global または botClient から取得
    let resolvedClient = client || global.client;
    if (!resolvedClient) {
      try {
        resolvedClient = require('../../botClient').client;
      } catch {
        // botClient.js が存在しない場合のエラーは無視
      }
    }

    if (!resolvedClient) { console.warn('[LOG] Discord Client が取得できません'); return; }

    const embed = new EmbedBuilder()
      .setTitle(logData.title || '設定変更ログ')
      .addFields(logData.fields || [])
      .setColor(0x00bfa5)
      .setTimestamp()
      .setFooter({ text: `実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}` });

    const channel = await resolvedClient.channels.fetch(logChannelId);
    if (!channel) {
      console.warn(`[LOG] ログ出力先チャンネルが見つかりません (${logChannelId})`);
      return;
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ 売上設定ログ送信エラー:', err);
  }
}

/**
 * 売上報告・承認ログなどをEmbed形式で出力（別スレッドでも使用可能）
 * @param {import('discord.js').TextChannel} channel - 出力先チャンネル
 * @param {object} options - { title, fields, color }
 */
async function sendReportLog(channel, options) {
  try {
    const embed = new EmbedBuilder()
      .setTitle(options.title || '売上報告ログ')
      .addFields(options.fields || [])
      .setColor(options.color || 0x00bfa5)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ 売上報告ログ送信エラー:', err);
  }
}

module.exports = { sendSettingLog, sendReportLog };
