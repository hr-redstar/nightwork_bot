// src/utils/config/configLogger.js

const { EmbedBuilder } = require('discord.js');
const logger = require('../logger');
const { getGuildConfig } = require('../config/gcsConfigManager');

/**
 * 実際に embed を送る共通処理
 * @param {import('discord.js').Guild} guild
 * @param {'command'|'setting'|'admin'} kind
 * @param {object} payload
 * @param {EmbedBuilder[]} payload.embeds
 * @param {string} [payload.content]
 * @param {string} [payload.replyToMessageId]
 */
async function sendLogEmbed(guild, kind, { embeds, content, replyToMessageId }) {
  const guildId = guild.id;
  const config = await getGuildConfig(guildId);

  let targetId;

  // kind ごとの優先順位で拾う
  switch (kind) {
    case 'command':
      targetId = config.commandLogThreadId || config.globalLogChannelId;
      break;

    case 'setting':
      targetId = config.settingLogThreadId || config.globalLogChannelId;
      break;

    case 'admin':
      targetId = config.adminLogChannelId || config.adminLogChannel || config.adminLogThreadId || config.globalLogChannelId;
      break;

    default:
      // 想定外の kind は global に投げる
      targetId = config.globalLogChannelId;
      break;
  }

  if (!targetId) {
    logger.warn(`[configLogger] ${kind} 用のログチャンネルが未設定です`);
    return null;
  }

  try {
    const channel = await guild.channels.fetch(targetId);
    if (!channel?.isTextBased()) {
      logger.warn(`[configLogger] ログチャンネル取得失敗 or テキストチャンネルではない: ${targetId}`);
      return null;
    }

    const messageOptions = { embeds, content };
    
    // ★返信指定があれば、そのメッセージに reply
    if (replyToMessageId) {
      const parent = await channel.messages.fetch(replyToMessageId).catch(() => null);
      if (parent) return await parent.reply(messageOptions);
    }

    return await channel.send(messageOptions);
  } catch (err) {
    logger.error(`[configLogger] ${kind} ログ送信エラー:`, err);
    return null;
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

  return await sendLogEmbed(interaction.guild, 'command', { embeds: [embed] });
}

async function sendSettingLog(interaction, payload) {
  const embed = buildBaseEmbed(interaction, {
    color: 0x00b894,
    ...payload,
  });
  return await sendLogEmbed(interaction.guild, 'setting', { embeds: [embed] });
}

async function sendAdminLog(interaction, payload) {
  const { embeds, content, replyToMessageId } = payload;
  let finalEmbeds = embeds;

  // If no embeds are provided, build a default one for backward compatibility.
  if (!finalEmbeds || !finalEmbeds.length) {
    finalEmbeds = [
      buildBaseEmbed(interaction, {
        color: 0xd63031,
        ...payload,
      }),
    ];
  }

  return await sendLogEmbed(interaction.guild, 'admin', {
    embeds: finalEmbeds,
    content,
    replyToMessageId,
  });
}

module.exports = {
  sendCommandLog,
  sendSettingLog,
  sendAdminLog,
};
