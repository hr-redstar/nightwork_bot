// src/handlers/syut/syutPanel_Kuro.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getTodayAttendance } = require('../../utils/syut/gcsSyut');

/**
 * 出退勤データをEmbed表示用にフォーマット
 * @param {Object} attendanceData
 * @returns {string}
 */
function formatAttendanceList(attendanceData) {
  if (Object.keys(attendanceData).length === 0) {
    return '本日の出勤者はいません。';
  }

  const sortedEntries = Object.values(attendanceData).sort((a, b) => {
    const timeA = a.in || '99:99'; // Sort by check-in time
    const timeB = b.in || '99:99';
    return timeA.localeCompare(timeB);
  });

  let formattedList = '';
  let lastInTime = '';

  for (const entry of sortedEntries) {
    const inTime = entry.in || '未出勤';
    const outTime = entry.out || '未退勤';

    if (inTime !== lastInTime) {
      if (formattedList !== '') formattedList += '\n';
      formattedList += `**${inTime}**\n`;
      lastInTime = inTime;
    }
    formattedList += `${entry.name} 退勤：${outTime}\n`;
  }
  return formattedList;
}

/**
 * 黒服出退勤パネルを新規作成
 */
async function createBlackPanel(interaction, storeName, channelId) {
  const ch = interaction.guild.channels.cache.get(channelId);
  if (!ch) return interaction.reply({ content: '⚠️ チャンネルが見つかりません。', flags: MessageFlags.Ephemeral });

  // パネルを送信
  const message = await ch.send({ content: 'パネルを準備中...' });

  const cfg = (await getGuildConfig(interaction.guild.id)) || {};
  if (!cfg.syutBlackChannels) cfg.syutBlackChannels = {};
  cfg.syutBlackChannels[storeName] = channelId;
  cfg.syutBlackPanelMessages = cfg.syutBlackPanelMessages || {};
  cfg.syutBlackPanelMessages[storeName] = message.id; // パネルメッセージIDを保存
  await setGuildConfig(interaction.guild.id, cfg);

  await interaction.reply({ content: '✅ 黒服出退勤パネルを設置しました。', flags: MessageFlags.Ephemeral });

  // パネルを更新して初期表示
  await updateBlackPanel(interaction.guild, storeName, channelId, message.id);
}

/**
 * 黒服出退勤パネルを更新
 */
async function updateBlackPanel(guild, storeName, channelId, messageId = null) {
  const ch = guild.channels.cache.get(channelId);
  if (!ch) return;

  const config = (await getGuildConfig(guild.id)) || {};
  const panelMessageId = messageId || config.syutBlackPanelMessages?.[storeName];
  if (!panelMessageId) return;

  const attendanceData = await getTodayAttendance(guild.id, storeName);
  const attendanceList = formatAttendanceList(attendanceData);

  const embed = new EmbedBuilder()
    .setTitle(`🕴️ 黒服 出退勤パネル｜${storeName}`)
    .setDescription(
      [
        '黒服設定',
        '役職： ロール：',
        '',
        `**本日の黒服一覧 ${new Date().toLocaleDateString('ja-JP')}**\n${attendanceList}`,
      ].join('\n')
    )
    .setColor(0x34495e);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`black_role_link_${storeName}`).setLabel('🧩 役職/ロール設定').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`black_reg_${storeName}`).setLabel('🟢 出退勤登録').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`black_manual_${storeName}`).setLabel('✍️ 手入力出退勤登録').setStyle(ButtonStyle.Primary),
  );

  try {
    const message = await ch.messages.fetch(panelMessageId);
    await message.edit({ embeds: [embed], components: [row1, row2] });
  } catch (error) {
    console.error(`❌ 黒服パネルメッセージの更新に失敗しました: ${error}`);
  }
}

module.exports = { createBlackPanel, updateBlackPanel };
