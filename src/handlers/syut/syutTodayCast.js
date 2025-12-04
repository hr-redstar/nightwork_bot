// src/handlers/syut/syutTodayCast.js
const { StringSelectMenuBuilder, ActionRowBuilder, ChannelType, MessageFlags } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getTodayAttendance } = require('../../utils/syut/gcsSyut');
const { updateCastPanel } = require('./syutPanel_Cast'); // Import updateCastPanel

async function showTodayCastSetup(interaction, storeName) {
  const channels = interaction.guild.channels.cache
    .filter(ch => ch.type === ChannelType.GuildText)
    .map(ch => ({ label: ch.name, value: ch.id }));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`cast_today_select_${storeName}`)
    .setPlaceholder('本日のキャストを送信するチャンネル')
    .addOptions(channels.slice(0, 25));
  await interaction.reply({ content: '🗓️ 送信先チャンネルを選択してください。', components: [new ActionRowBuilder().addComponents(select)], flags: MessageFlags.Ephemeral });
}

async function sendTodayCast(interaction, storeName, channelId, hour = '13:00') {
  // 直近データから一覧を生成（前日〜当日ファイルを探索する簡易版）
  const now = new Date();
  const attendanceData = await getTodayAttendance(interaction.guild.id, storeName, now);

  const lines = [];
  lines.push(`**本日のキャスト ${now.toLocaleDateString('ja-JP')}**`);
  lines.push(`${hour}`);
  // Assuming formatAttendanceList is available or similar logic
  for (const [_uid, rec] of Object.values(attendanceData).sort((a, b) => (a.in || '99:99').localeCompare(b.in || '99:99'))) {
    const out = rec.out || '未退勤';
    lines.push(`${rec.name} 退勤：${out}`);
  }
  const channel = await interaction.guild.channels.fetch(channelId).catch(()=>null);
  if (channel) await channel.send(lines.join('\n'));

  const cfg = (await getGuildConfig(interaction.guild.id)) || {};
  if (!cfg.castToday) cfg.castToday = {};
  cfg.castToday[storeName] = { channelId, hour };
  await setGuildConfig(interaction.guild.id, cfg);

  await interaction.reply({ content: '✅ 「本日のキャスト」を送信し、設定を保存しました。', flags: MessageFlags.Ephemeral });

  // パネルを更新
  const message = await interaction.channel.messages.fetch(interaction.message.id);
  await updateCastPanel(interaction.guild, storeName, interaction.channelId, message.id);
}

module.exports = { showTodayCastSetup, sendTodayCast };
