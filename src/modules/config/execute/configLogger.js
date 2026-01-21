// src/handlers/config/configLogger.js
const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const { sendSlackGlobalLog } = require('../../utils/config/slack/sendSlack');
const logger = require('../../utils/logger');

function buildFooterData(user, fallback = '設定操作') {
  const username =
    typeof user?.username === 'string' && user.username.trim()
      ? user.username
      : fallback;

  let iconURL;
  try {
    const maybeUrl =
      typeof user?.displayAvatarURL === 'function'
        ? user.displayAvatarURL()
        : null;
    if (typeof maybeUrl === 'string' && maybeUrl.length > 0) {
      iconURL = maybeUrl;
    }
  } catch (err) {
    logger.warn('[configLogger] displayAvatarURL の取得に失敗', err);
  }

  return iconURL ? { text: username, iconURL } : { text: username };
}

async function _sendToChannel(guild, channelId, payload) {
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (channel && channel.isTextBased()) {
    await channel
      .send(payload)
      .catch(err =>
        logger.error(`[configLogger] Failed to send to channel ${channelId}`, err)
      );
  }
}

async function sendSettingLog(guild, options) {
  const defaultUser = { username: '業務改善bot', displayAvatarURL: () => '' };
  const {
    user = defaultUser,
    message,
    type = '設定操作',
    embed: providedEmbed,
  } = options || {};
  const guildId = guild.id;

  try {
    const config = await getGuildConfig(guildId);
    if (!config) {
      logger.warn(`[configLogger] ${guildId} で設定情報が取得できません`);
      return;
    }

    const footer = buildFooterData(user);
    const embed = providedEmbed
      ? providedEmbed.setFooter(footer).setTimestamp()
      : new EmbedBuilder()
          .setTitle(`📝 ${type}`)
          .setDescription(message || '設定内容が更新されました。')
          .setColor(0x2ecc71)
          .setFooter(footer)
          .setTimestamp();

    const payload = { embeds: [embed] };

    await _sendToChannel(guild, config.settingLogThread, payload);
    await _sendToChannel(guild, config.adminLogChannel, payload);

    const slackText = `【${type}】${message ? `${message}\n` : ''}操作者：${user.username} (${user.id})`;
    await sendSlackGlobalLog(guildId, slackText);

    logger.info(`[configLogger] [${guild.name}] ${type}通知 by ${footer.text}`);
  } catch (err) {
    logger.error('[configLogger] 設定ログ送信エラー:', err);
  }
}

async function sendAdminLog(guild, options) {
  const { user, message } = options;
  const guildId = guild.id;

  try {
    const config = await getGuildConfig(guildId);
    if (!config?.adminLogChannel) return;

    const footer = buildFooterData(user, '運営');
    const embed = new EmbedBuilder()
      .setTitle('🛠️ 操作通知')
      .setDescription(message)
      .setColor(0x3498db)
      .setFooter(footer)
      .setTimestamp();

    await _sendToChannel(guild, config.adminLogChannel, { embeds: [embed] });
    const slackText = `【管理ログ】${message || ''} 操作者：${user.username} (${user.id})`;
    await sendSlackGlobalLog(guildId, slackText);
  } catch (err) {
    logger.error('[configLogger] 管理ログ送信エラー:', err);
  }
}

async function sendCommandLog(interaction) {
  const { guild, user, commandName } = interaction;
  if (!guild) return;

  try {
    const config = await getGuildConfig(guild.id);
    const threadId = config?.commandLogThread;
    if (!threadId) return;

    const thread = await guild.channels.fetch(threadId).catch(() => null);
    if (!thread || !thread.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle('Commands Log')
      .setDescription(`**実行コマンド** \`/${commandName}\``)
      .setColor(0x95a5a6)
      .addFields(
        { name: '実行者', value: `<@${user.id}> (${user.tag})`, inline: true },
        { name: 'チャンネル', value: `${interaction.channel}`, inline: true }
      )
      .setTimestamp();

    await thread.send({ embeds: [embed] });
  } catch (err) {
    logger.error('[configLogger] コマンドログ送信エラー:', err);
  }
}

module.exports = { sendSettingLog, sendAdminLog, sendCommandLog };
