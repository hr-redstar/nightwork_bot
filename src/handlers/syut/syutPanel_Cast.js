// src/handlers/syut/syutPanel_Cast.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSyutConfig, saveSyutConfig } = require('../../utils/syut/syutConfigManager');

/**
 * 内部：Embed作成（時間＋チャンネル）
 * @param {string} storeName
 * @param {object} info
 * @returns {EmbedBuilder}
 */
function buildCastPanelEmbed(storeName, info) {
  const timeText = info?.time || '未設定';
  const channelText = info?.channel || '未設定';

  return new EmbedBuilder()
    .setTitle(`👗 キャスト出退勤パネル｜${storeName}`)
    .setDescription('キャストの出退勤登録・本日一覧投稿を管理します。')
    .addFields(
      { name: '🎭 キャスト設定', value: '役職：未設定 / ロール：未設定', inline: false },
      { name: '📅 本日のキャスト一覧　時間：', value: `${timeText}\n${channelText}`, inline: false },
    )
    .setTimestamp();
}

/**
 * キャスト出退勤パネルを新規作成
 * メッセージIDを config に保持して後で編集できるようにする
 */
async function postCastPanel(channel, storeName) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);
  const info = config.castPanelList?.[storeName] || null;

  const embed = buildCastPanelEmbed(storeName, info);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cast_today_setup:${storeName}`).setLabel('📢 本日のキャスト設置').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`cast_role_setup:${storeName}`).setLabel('🧩 役職/ロール設定').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cast_register:${storeName}`).setLabel('🕒 出退勤登録').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cast_manual_register:${storeName}`).setLabel('✏️ 手入力出退勤登録').setStyle(ButtonStyle.Danger),
  );

  const msg = await channel.send({ embeds: [embed], components: [row1, row2] });

  // panelMessageId を保存（以後更新時に編集可能）
  config.castPanelList ||= {};
  config.castPanelList[storeName] ||= {};
  config.castPanelList[storeName].panelMessageId = msg.id;
  await saveSyutConfig(guildId, config);

  return msg;
}

/**
 * 設置済みパネルの埋め込みを更新（時間/チャンネル変更反映）
 */
async function updateCastPanelMessage(guild, storeName) {
  const config = await getSyutConfig(guild.id);
  const info = config.castPanelList?.[storeName];
  if (!info?.panelMessageId || !info?.panelChannelId) return; // panelChannelId は設置時に自動設定

  const panelChannel = guild.channels.cache.get(info.panelChannelId);
  if (!panelChannel) return;

  const msg = await panelChannel.messages.fetch(info.panelMessageId).catch(() => null);
  if (!msg) return;

  const embed = buildCastPanelEmbed(storeName, info);
  await msg.edit({ embeds: [embed], components: msg.components });
}

module.exports = { postCastPanel, updateCastPanelMessage };