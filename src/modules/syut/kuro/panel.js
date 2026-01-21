// src/handlers/syut/kuroPanel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');

function buildKuroPanelEmbed(storeName, info) {
  return new EmbedBuilder()
    .setTitle(`🕴️ 黒服出退勤パネル ${storeName}`)
    .addFields(
      { name: '黒服設定', value: `役職：${info?.role || '未設定'}`, inline: false },
      { name: '📅 本日の黒服一覧', value: `時間：${info?.time || '未設定'}\n${info?.channel || '未設定'}`, inline: false },
    )
    .setColor('#000000')
    .setTimestamp();
}

async function postKuroPanel(channel, storeName) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);
  const info = config.kurofukuPanelList?.[storeName] || null;

  const embed = buildKuroPanelEmbed(storeName, info);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`kuro_today_setup:${storeName}`).setLabel('📢 本日の黒服設置').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`kuro_role_setup:${storeName}`).setLabel('🧩 役職/ロール設定').setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`kuro_register:${storeName}`).setLabel('🕒 出退勤登録').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`kuro_manual_register:${storeName}`).setLabel('✏️ 手入力出退勤登録').setStyle(ButtonStyle.Danger),
  );

  const msg = await channel.send({ embeds: [embed], components: [row1, row2] });

  config.kurofukuPanelList ||= {};
  config.kurofukuPanelList[storeName] ||= {};
  config.kurofukuPanelList[storeName].panelMessageId = msg.id;
  config.kurofukuPanelList[storeName].panelChannelId = channel.id;
  await saveSyutConfig(guildId, config);

  return msg;
}

async function updateKuroPanelMessage(guild, storeName) {
  const config = await getSyutConfig(guild.id);
  const info = config.kurofukuPanelList?.[storeName];
  if (!info?.panelMessageId || !info?.panelChannelId) return;

  const panelChannel = guild.channels.cache.get(info.panelChannelId);
  if (!panelChannel) return;

  const msg = await panelChannel.messages.fetch(info.panelMessageId).catch(() => null);
  if (!msg) return;

  const embed = buildKuroPanelEmbed(storeName, info);
  await msg.edit({ embeds: [embed], components: msg.components });
}

module.exports = { postKuroPanel, updateKuroPanelMessage };
