// src/handlers/config/configLogger.js
const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');
const logger = require('../../utils/logger');

/**
 * 指定されたチャンネルIDにメッセージを送信するヘルパー関数
 * @param {import('discord.js').Guild} guild
 * @param {string} channelId
 * @param {import('discord.js').MessagePayload | import('discord.js').MessageOptions} payload
 */
async function _sendToChannel(guild, channelId, payload) {
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (channel && channel.isTextBased()) {
    await channel.send(payload).catch(err => logger.error(`[configLogger] Failed to send to channel ${channelId}`, err));
  }
}

/**
 * 設定ログ・管理者ログへの出力
 * @param {Guild} guild Discordギルド
 * @param {{ user: User, message: string, type?: string, embed?: EmbedBuilder }} options
 */
async function sendSettingLog(guild, options) {
  // userが未定義の場合に備えてデフォルト値を設定
  const { user = { username: '不明なユーザー', displayAvatarURL: () => '' }, message, type = '設定変更', embed: providedEmbed } = options || {};
  const guildId = guild.id;

  try {
    const config = await getGuildConfig(guildId);
    if (!config) {
      logger.warn(`[configLogger] ${guildId} 設定ログ出力スキップ：設定ファイルなし`);
      return;
    }

    const embed = providedEmbed
      ? providedEmbed
          .setFooter({ text: `${user.username}`, iconURL: user.displayAvatarURL() })
          .setTimestamp()
      : new EmbedBuilder()
          .setTitle(`🪵 ${type}`)
          .setDescription(message || '詳細不明の操作が実行されました。')
          .setColor(0x2ecc71)
          .setFooter({ text: `${user.username}`, iconURL: user.displayAvatarURL() })
          .setTimestamp();

    const payload = { embeds: [embed] };

    // 設定ログスレッド
    await _sendToChannel(guild, config.settingLogThread, payload);

    // 管理者ログチャンネル
    await _sendToChannel(guild, config.adminLogChannel, payload);

    logger.info(`[configLogger] [${guild.name}] ${type}ログ出力: ${user.username}`);
  } catch (err) {
    logger.error('[configLogger] 設定ログ出力エラー:', err);
  }
}

/**
 * コマンド実行などの結果ログ（管理者ログ専用）
 * @param {Guild} guild
 * @param {{ user: User, message: string }} options
 */
async function sendAdminLog(guild, options) {
  const { user, message } = options;
  const guildId = guild.id;

  try {
    const config = await getGuildConfig(guildId);
    if (!config?.adminLogChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🧭 実行ログ')
      .setDescription(message)
      .setColor(0x3498db)
      .setFooter({ text: `${user.username}`, iconURL: user.displayAvatarURL() })
      .setTimestamp();

    await _sendToChannel(guild, config.adminLogChannel, { embeds: [embed] });
  } catch (err) {
    logger.error('[configLogger] 管理者ログ出力エラー:', err);
  }
}

/**
 * コマンド実行ログをコマンドログスレッドに出力する (ChatInputCommandInteraction)
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function sendCommandLog(interaction) {
  const { guild, user, commandName } = interaction;
  if (!guild) return; // DMでのコマンドは対象外

  try {
    const config = await getGuildConfig(guild.id);
    const threadId = config?.commandLogThread;
    if (!threadId) return;

    const thread = await guild.channels.fetch(threadId).catch(() => null);
    if (!thread || !thread.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle('▶️ コマンド実行ログ')
      .setDescription(`**コマンド:** \`/${commandName}\``)
      .setColor(0x95a5a6) // グレー
      .addFields(
        { name: '実行者', value: `<@${user.id}> (${user.tag})`, inline: true },
        { name: 'チャンネル', value: `${interaction.channel}`, inline: true }
      )
      .setTimestamp();

    await thread.send({ embeds: [embed] });
  } catch (err) {
    logger.error('[configLogger] コマンドログの出力に失敗しました:', err);
  }
}

module.exports = { sendSettingLog, sendAdminLog, sendCommandLog };
