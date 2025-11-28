/**
 * autoPost 開発テスト
 * Cloud Scheduler / node-cron に依存せず手動実行可能
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { getSyutConfig, getDailySyuttaikin } = require('./syutConfigManager'); // 本来は autoPost.js で使う想定

// ★ 環境変数に Discord Bot トークンとテストチャンネルID を設定してください
const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID; // 投稿テスト用

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`✅ ログイン成功: ${client.user.tag}`);
  await testPostTodaysCast(client);
  process.exit(0);
});

/**
 * テスト用 本日のキャスト投稿
 */
async function testPostTodaysCast(client) {
  // 任意のギルドIDを指定（複数でも可）
  const guild = client.guilds.cache.first();
  if (!guild) return console.error('⚠️ ギルドが見つかりません。');

  const config = await getSyutConfig(guild.id);
  const storeEntries = Object.entries(config.castPanelList || {});
  if (storeEntries.length === 0) return console.log('⚠️ castPanelList が空です。');

  for (const [storeName, info] of storeEntries) {
    console.log(`\n--- 店舗: ${storeName} ---`);
    const channelId = TEST_CHANNEL_ID || info.channel?.replace(/[<#>]/g, '');
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`⚠️ チャンネルが存在しません (${channelId})`);
      continue;
    }

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

    // 実際の投稿
    await channel.send({ embeds: [embed] });
    console.log(`✅ 投稿完了: ${storeName}`);
  }
}

client.login(TOKEN);