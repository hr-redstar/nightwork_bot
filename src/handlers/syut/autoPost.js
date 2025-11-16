const { getSyutConfig, getDailySyuttaikin } = require('../utils/syut/syutConfigManager');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

/**
 * 全店舗の設定を読み取り、各店舗の「本日のキャスト」を送信
 */
async function postTodaysCastAll(client) {
  if (!client) {
    logger.error('❌ Discord Clientが利用できません。');
    return;
  }
  const guilds = client.guilds.cache.map(g => g);
  for (const guild of guilds) {
    const config = await getSyutConfig(guild.id);
    if (!config.castPanelList) continue;

    for (const [storeName, info] of Object.entries(config.castPanelList)) {
      if (!info.channel || !info.time) continue;

      const channel = guild.channels.cache.get(info.channel.replace(/[<#>]/g, ''));
      if (!channel) continue;

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const daily = await getDailySyuttaikin(guild.id, storeName, dateStr);
      const sorted = [...(daily.cast || [])].sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));

      const lines = sorted.length
        ? sorted.map(p => `🕒 ${p.start}　${p.name}（退勤：${p.end}）`).join('\n')
        : '登録なし';

      const embed = new EmbedBuilder()
        .setTitle(`📅 本日のキャスト ${y}年${m}月${d}日`)
        .setDescription(lines)
        .setFooter({ text: `店舗：${storeName}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info(`✅ ${guild.name}/${storeName} に投稿完了`);
    }
  }
}

module.exports = { postTodaysCastAll };