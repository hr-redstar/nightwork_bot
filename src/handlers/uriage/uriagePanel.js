﻿// src/handlers/uriage/uriagePanel.js
// 売上設定パネルをDiscordチャンネルに設置・更新する処理

const { buildUriagePanelConfig } = require('./uriagePanel_config');
const { getUriageConfig, saveUriageConfig } = require('../../utils/uriage/gcsUriageManager');

/**
 * 売上設定パネルを指定チャンネルに投稿
 * @param {import('discord.js').TextChannel} channel - 投稿先チャンネル
 */
async function postUriagePanel(channel) {
  try {
    const guildId = channel.guild.id;

    // Embed + Components の構成を取得
    const panel = await buildUriagePanelConfig(guildId);

    // 投稿
    const message = await channel.send({
      embeds: panel.embeds,
      components: panel.components,
    });

    // GCS に最新パネル情報を保存（メッセージID, チャンネルID）
    await saveUriageConfig(guildId, {
      lastPanelMessageId: message.id,
      lastPanelChannelId: channel.id,
      updatedAt: new Date().toLocaleString('ja-JP'),
    });

    console.log(`✅ 売上設定パネルを設置: guild=${guildId} channel=${channel.id}`);
  } catch (err) {
    console.error('❌ 売上設定パネル設置エラー:', err);
    throw err;
  }
}

module.exports = { postUriagePanel };
