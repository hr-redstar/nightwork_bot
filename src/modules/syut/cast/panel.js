// src/handlers/syut/syutPanel_Cast.js
const { ButtonStyle } = require('discord.js');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');
const { buildPanel } = require('../../../utils/ui/panelBuilder');

/**
 * キャスト出退勤パネル生成 (Embed + Buttons)
 */
function createCastPanel(storeName, info) {
  const fields = [
    { name: 'キャスト設定', value: `役職：${info?.role || '未設定'}`, inline: false },
    { name: '📅 本日のキャスト一覧', value: `時間：${info?.time || '未設定'}\n${info?.channel || '未設定'}`, inline: false },
  ];

  const buttons = [
    [
      { id: `cast_today_setup:${storeName}`, label: '📢 本日のキャスト設置', style: ButtonStyle.Primary },
      { id: `cast_role_setup:${storeName}`, label: '🧩 役職/ロール設定', style: ButtonStyle.Secondary },
    ],
    [
      { id: `cast_register:${storeName}`, label: '🕒 出退勤登録', style: ButtonStyle.Success },
      { id: `cast_manual_register:${storeName}`, label: '✏️ 手入力出退勤登録', style: ButtonStyle.Danger },
    ]
  ];

  const panel = buildPanel({
    title: `👗 キャスト出退勤パネル ${storeName}`,
    description: '',
    fields: fields,
    buttons: buttons
  });

  panel.embeds[0].setColor('#e91e63').setTimestamp();
  return panel;
}

/**
 * キャスト出退勤パネルを新規作成
 */
async function postCastPanel(channel, storeName) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);
  const info = config.castPanelList?.[storeName] || null;

  const content = createCastPanel(storeName, info);
  const msg = await channel.send(content);

  // panelMessageId を保存
  config.castPanelList ||= {};
  config.castPanelList[storeName] ||= {};
  config.castPanelList[storeName].panelMessageId = msg.id;
  await saveSyutConfig(guildId, config);

  return msg;
}

/**
 * 設置済みパネルの埋め込みを更新
 */
async function updateCastPanelMessage(guild, storeName) {
  const config = await getSyutConfig(guild.id);
  const info = config.castPanelList?.[storeName];
  if (!info?.panelMessageId || !info?.panelChannelId) return;

  const panelChannel = guild.channels.cache.get(info.panelChannelId);
  if (!panelChannel) return;

  const msg = await panelChannel.messages.fetch(info.panelMessageId).catch(() => null);
  if (!msg) return;

  const content = createCastPanel(storeName, info);
  await msg.edit(content);
}

module.exports = { postCastPanel, updateCastPanelMessage };