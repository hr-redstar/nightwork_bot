// src/handlers/keihi/経費設定/keihiPanel.js
// 経費設定パネルをDiscordチャンネルに設置・更新する処理

const { buildKeihiPanelConfig } = require('./keihiPanel_Config');
const { saveKeihiConfig } = require('../../../utils/keihi/gcsKeihiManager');

/**
 * 経費設定パネルを指定チャンネルに投稿
 * @param {import('discord.js').TextChannel} channel - 投稿先チャンネル
 * @param {object} config - 現在のギルド設定
 * @returns {Promise<import('discord.js').Message>}
 */
async function postKeihiPanel(channel, config) {
  try {
    const guildId = channel.guild.id;

    // Embed + Components の構成を取得
    const panel = await buildKeihiPanelConfig(guildId, config);

    // 新しいパネルを投稿する
    const message = await channel.send({
      embeds: panel.embeds,
      components: panel.components,
    });
    console.log(`✅ 経費設定パネルを設置: guild=${guildId} channel=${channel.id}`);
    return message;
  } catch (err) {
    console.error('❌ 経費設定パネル設置エラー:', err);
    throw err;
  }
}

module.exports = { postKeihiPanel };