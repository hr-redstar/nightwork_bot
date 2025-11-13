// src/handlers/keihi/keihiPanel.js
// 経費設定パネルをDiscordチャンネルに設置・更新する処理

const { buildKeihiPanelConfig } = require('./keihiPanel_config');
const { saveKeihiConfig } = require('../../utils/keihi/gcsKeihiManager');

/**
 * 経費設定パネルを指定チャンネルに投稿
 * @param {import('discord.js').TextChannel} channel - 投稿先チャンネル
 */
async function postKeihiPanel(channel) {
  try {
    const guildId = channel.guild.id;

    // Embed + Components の構成を取得
    const panel = await buildKeihiPanelConfig(guildId);

    // 投稿
    const message = await channel.send({
      embeds: panel.embeds,
      components: panel.components,
    });

    // GCS に最新パネル情報を保存（メッセージID, チャンネルID）
    await saveKeihiConfig(guildId, {
      lastPanelMessageId: message.id,
      lastPanelChannelId: channel.id,
    });

    console.log(`✅ 経費設定パネルを設置: guild=${guildId} channel=${channel.id}`);
  } catch (err) {
    console.error('❌ 経費設定パネル設置エラー:', err);
    throw err;
  }
}

module.exports = { postKeihiPanel };