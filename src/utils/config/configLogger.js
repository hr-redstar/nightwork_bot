// src/utils/config/configLogger.js
// ----------------------------------------------------
// 設定ログ・管理者ログ・コマンドログ 共通ロガー（最新版）
// ----------------------------------------------------

const { EmbedBuilder } = require("discord.js");
const logger = require("../logger");
const { getGuildConfig } = require("./gcsConfigManager");

// -----------------------------------------------
// 内部ヘルパー：指定チャンネルに安全に送信
// -----------------------------------------------
async function sendToChannel(guild, channelId, payload) {
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    await channel.send(payload);
  } catch (err) {
    logger.error(`[configLogger] チャンネル送信エラー: ${channelId}`, err);
  }
}

// ======================================================
// ① コマンドログ（/コマンド実行）
// ======================================================
async function sendCommandLog(interaction) {
  try {
    const guild = interaction.guild;
    const guildId = guild.id;

    const config = await getGuildConfig(guildId);
    const threadId = config.commandLogThread;

    if (!threadId) return;

    const thread = guild.channels.cache.get(threadId);
    if (!thread || !thread.isTextBased()) return;

    await thread.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("▶️ コマンド実行ログ")
          .setColor(0x95a5a6)
          .setDescription(`\`/${interaction.commandName}\``)
          .addFields(
            { name: "実行者", value: `<@${interaction.user.id}>`, inline: true },
            { name: "チャンネル", value: `${interaction.channel}`, inline: true }
          )
          .setTimestamp(),
      ],
    });
  } catch (err) {
    logger.error("[configLogger] sendCommandLog エラー:", err);
  }
}

// ======================================================
// ② 設定変更ログ（設定ログ + 管理者ログ 両方へ出力）
// ======================================================
async function sendSettingLog(guild, { user, message, embed: customEmbed }) {
  try {
    const guildId = guild.id;

    const config = await getGuildConfig(guildId);
    if (!config) return;

    const embed =
      customEmbed ||
      new EmbedBuilder()
        .setTitle("⚙️ 設定変更ログ")
        .setDescription(message || "設定が更新されました。")
        .setColor(0x2ecc71)
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL() })
        .setTimestamp();

    const payload = { embeds: [embed] };

    // 設定ログスレッド
    await sendToChannel(guild, config.settingLogThread, payload);

    // 管理者ログ
    await sendToChannel(guild, config.adminLogChannel, payload);

    logger.info(
      `[configLogger] 設定ログ出力: ${guild.name} by ${user.username}`
    );
  } catch (err) {
    logger.error("[configLogger] sendSettingLog エラー:", err);
  }
}

module.exports = {
  sendCommandLog,
  sendSettingLog,
};
