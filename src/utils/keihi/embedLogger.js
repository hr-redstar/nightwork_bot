// src/utils/keihi/embedLogger.js
// ----------------------------------------------------
// 経費機能向け ログ出力ヘルパー
//   - 設定ログ
//   - 管理者ログ
//   - コマンドログ
// GCS/{guildId}/config/config.json を参照
// ----------------------------------------------------

const { EmbedBuilder } = require('discord.js');
const gcs = require('../gcs');
const { keihiGlobalConfigPath } = require('./keihiConfigManager'); // ★ インポートを追加
const logger = require('../logger');

async function loadGuildConfig(guildId) {
  try {
    // 経費機能のログチャンネル設定は、経費機能のグローバル設定ファイルから読み込む
    // keihiConfigManager の loadKeihiConfig を使うのが理想だが、
    // 循環参照を避けるため、ここではパスを直接組み立てて readJSON を呼ぶ
    return (await gcs.readJSON(keihiGlobalConfigPath(guildId))) || {};
  } catch (err) {
    logger.error('[keihi/embedLogger] guild config 読み込みエラー:', err);
    return {};
  }
}

/**
 * 実際に embed を送る共通処理
 * @param {import('discord.js').Guild} guild
 * @param {'command'|'setting'|'admin'} kind
 * @param {EmbedBuilder} embed
 */
async function sendLogEmbed(guild, kind, embed) {
  const guildId = guild.id;
  const config = await loadGuildConfig(guildId);

  // config.json のキー名は実プロジェクトに合わせて調整
  const channelId = config[`${kind}LogChannelId`];
  const threadId = config[`${kind}LogThreadId`];

  if (!channelId) {
    logger.warn(`[keihi/embedLogger] ${kind}LogChannelId が未設定です`);
    return;
  }

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      logger.warn(`[keihi/embedLogger] ログチャンネル取得失敗: ${channelId}`);
      return;
    }

    if (threadId) {
      try {
        const thread = await guild.channels.fetch(threadId);
        if (thread && thread.isThread()) {
          await thread.send({ embeds: [embed] });
          return;
        }
      } catch (e) {
        logger.warn(
          `[keihi/embedLogger] ログスレッド取得失敗: ${threadId} （チャンネルに直接送信にフォールバック）`,
        );
      }
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('[keihi/embedLogger] ログ送信エラー:', err);
  }
}

/**
 * embed 生成の共通化
 */
function buildBaseEmbed(interaction, { title, description, fields, color }) {
  const embed = new EmbedBuilder()
    .setTitle(title || 'ログ')
    .setDescription(description || '')
    .setColor(color ?? 0x0984e3)
    .setTimestamp();

  if (interaction?.user) {
    embed.setFooter({
      text: `実行者: ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL?.() || undefined,
    });
  }

  if (Array.isArray(fields) && fields.length) {
    embed.addFields(fields);
  }

  return embed;
}

// ----------------------------------------------------
// 外部公開関数
// ----------------------------------------------------

async function sendCommandLog(interaction, payload) {
  const embed = buildBaseEmbed(interaction, payload);
  await sendLogEmbed(interaction.guild, 'command', embed);
}

async function sendSettingLog(interaction, payload) {
  const embed = buildBaseEmbed(interaction, {
    color: 0x00b894,
    ...payload,
  });
  await sendLogEmbed(interaction.guild, 'setting', embed);
}

async function sendAdminLog(interaction, payload) {
  const embed = buildBaseEmbed(interaction, {
    color: 0xd63031,
    ...payload,
  });
  await sendLogEmbed(interaction.guild, 'admin', embed);
}

module.exports = {
  sendCommandLog,
  sendSettingLog,
  sendAdminLog,
};
