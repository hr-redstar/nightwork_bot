// src/handlers/keihi/経費設定/keihiPanel.js
// 経費設定パネルをDiscordチャンネルに設置・更新する処理

const { buildKeihiPanelConfig } = require('./keihiPanel_Config');
const { saveKeihiConfig } = require('../../../utils/keihi/gcsKeihiManager');

/**
 * 経費設定パネルを指定チャンネルに投稿
 * @param {import('discord.js').TextChannel} channel - 投稿先チャンネル
 */
async function postKeihiPanel(channel) {
  try {
    const guildId = channel.guild.id;

    // Embed + Components の構成を取得
    const panel = await buildKeihiPanelConfig(guildId);

    // チャンネル内の既存パネルを探す
    const messages = await channel.messages.fetch({ limit: 50 });
    const existingPanel = messages.find(
      (m) => m.author.id === channel.client.user.id && m.embeds[0]?.title === '💼 経費設定パネル'
    );

    if (existingPanel) {
      await existingPanel.edit({ embeds: panel.embeds, components: panel.components });
      console.log(`🔄 経費設定パネルを更新: guild=${guildId} channel=${channel.id}`);
    } else {
      const message = await channel.send({
        embeds: panel.embeds,
        components: panel.components,
      });
      console.log(`✅ 経費設定パネルを設置: guild=${guildId} channel=${channel.id}`);
    }

    // GCSへの保存ロジックは updateKeihiPanel に集約するため、ここでは削除
    // lastPanelMessageId などの保存は、パネルが実際に操作されたときに更新するのがより堅牢
  } catch (err) {
    console.error('❌ 経費設定パネル設置エラー:', err);
    throw err;
  }
}

module.exports = { postKeihiPanel };