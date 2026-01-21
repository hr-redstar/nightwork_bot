const { ButtonStyle } = require('discord.js');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');
const { buildPanel } = require('../../../utils/ui/panelBuilder');

function createKuroPanel(storeName, info) {
  const fields = [
    { name: '黒服設定', value: `役職：${info?.role || '未設定'}`, inline: false },
    { name: '📅 本日の黒服一覧', value: `時間：${info?.time || '未設定'}\n${info?.channel || '未設定'}`, inline: false },
  ];

  const buttons = [
    [
      { id: `kuro_today_setup:${storeName}`, label: '📢 本日の黒服設置', style: ButtonStyle.Primary },
      { id: `kuro_role_setup:${storeName}`, label: '🧩 役職/ロール設定', style: ButtonStyle.Secondary },
    ],
    [
      { id: `kuro_register:${storeName}`, label: '🕒 出退勤登録', style: ButtonStyle.Success },
      { id: `kuro_manual_register:${storeName}`, label: '✏️ 手入力出退勤登録', style: ButtonStyle.Danger },
    ]
  ];

  const panel = buildPanel({
    title: `🕴️ 黒服出退勤パネル ${storeName}`,
    description: '',
    fields: fields,
    buttons: buttons
  });

  panel.embeds[0].setColor('#000000').setTimestamp();
  return panel;
}

async function postKuroPanel(channel, storeName) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);
  const info = config.kurofukuPanelList?.[storeName] || null;

  const content = createKuroPanel(storeName, info);
  const msg = await channel.send(content);

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

  const content = createKuroPanel(storeName, info);
  await msg.edit(content);
}

module.exports = { postKuroPanel, updateKuroPanelMessage };
