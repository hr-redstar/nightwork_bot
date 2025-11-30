// src/utils/config/configLogger.js

const { EmbedBuilder } = require('discord.js');
const gcs = require('../gcs');
const logger = require('../logger');
const { configPath: guildConfigPath } = require('../config/gcsConfigManager');

async function loadGuildConfig(guildId) {
  try {
    return (await gcs.readJSON(guildConfigPath(guildId))) || {};
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

  let channelId;
  let threadId;

  // kind ごとの優先順位で拾う
  switch (kind) {
    case 'command':
      channelId =
        config.commandLogChannelId ||
        config.commandLogChannel ||
        config.globalLogChannel; // ← 最後に globalLogChannel
      threadId =
        config.commandLogThreadId ||
        config.commandLogThread;
      break;

    case 'setting':
      channelId =
        config.settingLogChannelId ||
        config.settingLogChannel ||
        config.logChannelId || // 汎用ログ
        config.globalLogChannel; // 経費申請はこちらに分類される
      threadId =
        config.settingLogThreadId ||
        config.settingLogThread;
      break;

    case 'admin':
      channelId =
        config.adminLogChannelId ||
        config.adminLogChannel ||
        config.globalLogChannel;
      threadId =
        config.adminLogThreadId ||
        config.adminLogThread;
      break;

    default:
      // 想定外の kind は global に投げる
      channelId = config.globalLogChannel || config.adminLogChannel;
      threadId = null;
      break;
  }

  if (!channelId && !threadId) {
    logger.warn(`[keihi/embedLogger] ${kind} 用のログチャンネルが未設定です`);
    return;
  }

  try {
    // ① threadId があれば、まずスレッドを優先
    if (threadId) {
      try {
        const thread = await guild.channels.fetch(threadId);
        if (thread && thread.isThread && thread.isThread()) {
          await thread.send({ embeds: [embed] });
          return;
        }
        // 取れなかったらチャンネルにフォールバック
        logger.warn(
          `[keihi/embedLogger] ログスレッド取得失敗: ${threadId} （チャンネルに直接送信にフォールバック）`,
        );
      } catch (e) {
        logger.warn(
          `[keihi/embedLogger] ログスレッド取得エラー: ${threadId} （チャンネルに直接送信にフォールバック）`,
          e,
        );
      }
    }

    // ② スレッドが無い or 失敗した場合は、チャンネルに送信
    if (!channelId) {
      logger.warn(
        `[keihi/embedLogger] ${kind}LogChannel が未設定のためメッセージ送信をスキップします`,
      );
      return;
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      logger.warn(`[keihi/embedLogger] ログチャンネル取得失敗: ${channelId}`);
      return;
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

async function sendCommandLog(interaction, payload = {}) {
  const defaultPayload = {
    title: `コマンド実行: /${interaction.commandName}`,
    description: `${interaction.user} が /${interaction.commandName} を実行しました。`,
  };

  const embed = buildBaseEmbed(interaction, {
    ...defaultPayload,
    ...payload, // 明示指定があれば上書き
  });

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
