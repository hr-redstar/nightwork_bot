// src/utils/keihi/embedLogger.js
// ----------------------------------------------------
// 経費機能向け ログ出力ヘルパー
//   - 設定ログ
//   - 管理者ログ
//   - コマンドログ
// 経費グローバル設定 (keihi/config.json) を参照して
// 各種ログチャンネル / スレッドを解決する
// ----------------------------------------------------

const { EmbedBuilder } = require('discord.js');
const gcs = require('../gcs');
const { keihiGlobalConfigPath } = require('./keihiConfigManager');
const logger = require('../logger');

/**
 * 経費用のグローバル設定を読み込み
 * keihiGlobalConfigPath(guildId) が返す JSON をそのまま使う
 * 期待されるキー:
 *  - commandLogChannelId / commandLogThreadId
 *  - settingLogChannelId / settingLogThreadId
 *  - adminLogChannelId   / adminLogThreadId
 */
async function loadGuildConfig(guildId) {
  try {
    return (await gcs.readJSON(keihiGlobalConfigPath(guildId))) || {};
  } catch (err) {
    logger.error('[keihi/embedLogger] guild config 読み込みエラー:', err);
    return {};
  }
}

/**
 * 実際に embed を送る共通処理
 * @param {import('discord.js').Guild | null} guild
 * @param {'command'|'setting'|'admin'} kind
 * @param {EmbedBuilder} embed
 */
async function sendLogEmbed(guild, kind, embed) {
  if (!guild) {
    logger.warn('[keihi/embedLogger] guild が未定義のためログ送信をスキップしました');
    return;
  }

  const guildId = guild.id;
  const config = await loadGuildConfig(guildId);

  // keihi グローバル設定内のキー名（例: settingLogChannelId など）
  const channelId = config[`${kind}LogChannelId`];
  const threadId = config[`${kind}LogThreadId`];

  if (!channelId) {
    logger.warn(`[keihi/embedLogger] ${kind}LogChannelId が未設定です (guildId=${guildId})`);
    return;
  }

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      logger.warn(
        `[keihi/embedLogger] ログチャンネル取得失敗: ${channelId} (guildId=${guildId})`,
      );
      return;
    }

    // スレッドが設定されている場合はスレッド優先
    if (threadId) {
      try {
        const thread = await guild.channels.fetch(threadId);
        if (thread && thread.isThread()) {
          await thread.send({ embeds: [embed] });
          return;
        }
        logger.warn(
          `[keihi/embedLogger] ログスレッドが見つからないかスレッドではありません: ${threadId}`,
        );
      } catch (e) {
        logger.warn(
          `[keihi/embedLogger] ログスレッド取得失敗: ${threadId} （チャンネルへフォールバック）`,
        );
      }
    }

    // スレッドなし or 取得失敗 → チャンネルに直接送信
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
    const avatar =
      typeof interaction.user.displayAvatarURL === 'function'
        ? interaction.user.displayAvatarURL()
        : undefined;

    embed.setFooter({
      text: `実行者: ${interaction.user.tag}`,
      iconURL: avatar,
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
