// src/handlers/config/configLogger.js
const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 設定ログ・管理者ログへの出力
 * @param {Guild} guild Discordギルド
 * @param {{ user: User, message: string, type?: string, embed?: EmbedBuilder }} options
 */
async function sendSettingLog(guild, options) {
  const { user, message, type = '設定変更', embed: providedEmbed } = options;
  const guildId = guild.id;

  try {
    const config = await getGuildConfig(guildId);
    if (!config) {
      console.warn(`⚠️ ${guildId} 設定ログ出力スキップ：設定ファイルなし`);
      return;
    }

    const embed = providedEmbed
      ? providedEmbed.setFooter({ text: `${user.username}`, iconURL: user.displayAvatarURL() }).setTimestamp()
      : new EmbedBuilder()
          .setTitle(`🪵 ${type}`)
          .setDescription(message || '詳細不明の操作が実行されました。')
          .setColor(0x2ecc71)
          .setFooter({ text: `${user.username}`, iconURL: user.displayAvatarURL() })
          .setTimestamp();

    // 設定ログスレッド
    if (config.settingLogThread) {
      const settingThread = await guild.channels
        .fetch(config.settingLogThread)
        .catch(() => null);
      if (settingThread) {
        await settingThread.send({ embeds: [embed] });
      }
    }

    // 管理者ログチャンネル
    if (config.adminLogChannel) {
      const adminLogChannel = await guild.channels
        .fetch(config.adminLogChannel)
        .catch(() => null);
      if (adminLogChannel) {
        await adminLogChannel.send({ embeds: [embed] });
      }
    }

    console.log(
      `🪵 [${guild.name}] ${type}ログ出力: ${user.username} → ${message}`
    );
  } catch (err) {
    console.error('❌ 設定ログ出力エラー:', err);
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

    const adminLogChannel = await guild.channels
      .fetch(config.adminLogChannel)
      .catch(() => null);
    if (adminLogChannel) {
      await adminLogChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('❌ 管理者ログ出力エラー:', err);
  }
}

module.exports = { sendSettingLog, sendAdminLog };
