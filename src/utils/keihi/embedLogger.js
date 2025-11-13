// src/utils/keihi/embedLogger.js

const { EmbedBuilder } = require('discord.js');
const { getKeihiConfig } = require('./gcsKeihiManager');

/**
 * 経費関連の設定変更ログをEmbed形式で出力する共通関数
 * @param {string} guildId - ギルドID
 * @param {object} logData - ログ内容 { title, fields }
 * @param {import('discord.js').Client} [client] - Discordクライアント（任意）
 */
async function sendSettingLog(guildId, logData, client) {
  try {
    const config = await getKeihiConfig(guildId);
    const logChannelId = config?.logChannelId;

    if (!logChannelId) {
      console.warn(`[LOG] 経費設定ログチャンネル未設定 (${guildId})`);
      return;
    }

    let resolvedClient = client || global.client;
    if (!resolvedClient) {
      try {
        resolvedClient = require('../../botClient').client;
      } catch { /* botClient.js が存在しない場合のエラーは無視 */ }
    }

    if (!resolvedClient) { console.warn('[LOG] Discord Client が取得できません'); return; }

    const embed = new EmbedBuilder()
      .setTitle(logData.title || '経費設定変更ログ')
      .addFields(logData.fields || [])
      .setColor(0x0078ff) // 経費モジュールのテーマカラー
      .setTimestamp();

    const channel = await resolvedClient.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return console.warn(`[LOG] ログ出力先チャンネルが見つかりません (${logChannelId})`);

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('❌ 経費設定ログ送信エラー:', err);
  }
}

module.exports = { sendSettingLog };