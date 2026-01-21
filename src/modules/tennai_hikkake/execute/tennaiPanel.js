// src/handlers/tennai_hikkake/tennaiPanel.js
const { ButtonStyle } = require('discord.js');
const dayjs = require('dayjs');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const logger = require('../../../utils/logger');

/**
 * storeName: 店舗名
 * attendance: 出退勤データ (dailySyuttaikin.cast array)
 * hikakakeLogs: 接客ログ
 */
function createDynamicTennaiPanel(storeName, attendance, hikakakeLogs) {
  // 1. 出勤キャスト総数
  const totalCast = attendance ? attendance.length : 0;

  // 2. 接客中キャスト数
  const confirmedLogs = hikakakeLogs.filter(h => h.store === storeName && h.type === '確定');
  const currentCustomers = confirmedLogs.reduce((sum, log) => sum + log.num, 0);

  // 簡易計算: 空きキャスト
  let freeCast = totalCast - currentCustomers;
  if (freeCast < 0) freeCast = 0;

  // 客数一覧データ
  const customersList = hikakakeLogs
    .filter(h => h.store === storeName)
    .map(h => ({
      type: h.type === '予定' ? 'ひっかけ予定' : h.type === '確定' ? 'ひっかけ確定' : '失敗',
      enterTime: h.enterTime || '-',
      num: h.num,
      group: h.group,
      plan: h.plan || '-',
      cast: h.castList && h.castList.length > 0 ? h.castList.join(' ') : '-',
      inputUser: h.inputUser,
    }));

  // フィールド作成
  const fields = [
    { name: '✨ 接客中', value: `${currentCustomers}名`, inline: true },
    { name: '👯 出勤キャスト', value: `${totalCast}名`, inline: true },
    { name: '💤 空きキャスト', value: `${freeCast}名`, inline: true },
  ];

  if (customersList.length > 0) {
    const customersText = customersList
      .map(c => {
        let icon = '🚶';
        if (c.type.includes('予定')) icon = '🐟';
        if (c.type.includes('確定')) icon = '🎣';
        if (c.type.includes('失敗')) icon = '💨';
        return `${icon} **${c.type}** [${c.enterTime}] ${c.num}名 ${c.group}組 (担当:${c.cast}) by ${c.inputUser}`;
      })
      .join('\n');
    const truncatedText = customersText.length > 1000 ? customersText.substring(0, 1000) + '...' : customersText;
    fields.push({ name: '👥 客数一覧', value: truncatedText, inline: false });
  } else {
    fields.push({ name: '👥 客数一覧', value: 'データなし', inline: false });
  }

  // ボタン作成
  const buttons = [
    [
      { id: `hikkake_report_plan:${storeName}`, label: '🐟 ひっかけ予定', style: ButtonStyle.Primary },
      { id: `hikkake_report_failed:${storeName}`, label: '💨 ひっかけ失敗', style: ButtonStyle.Danger },
      { id: `hikkake_report_edit:${storeName}`, label: '✏️ 内容修正', style: ButtonStyle.Secondary },
    ],
    [
      { id: `hikkake_report_success:${storeName}`, label: '🎣 ひっかけ確定', style: ButtonStyle.Success }
    ]
  ];

  const panel = buildPanel({
    title: `🏬 店舗: ${storeName}`,
    description: `📅 ${dayjs().format('YYYY/MM/DD')}`,
    fields: fields,
    buttons: buttons
  });
  // set color
  panel.embeds[0].setColor('#2b2d31');
  return panel;
}

async function updateStorePanel(client, storeName, attendance, hikakakeLogs, storePanelConfig) {
  try {
    const storeConfig = storePanelConfig[storeName];
    if (!storeConfig) return logger.warn(`[TennaiPanel] 店舗設定が見つかりません: ${storeName}`);

    const channel = await client.channels.fetch(storeConfig.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(storeConfig.messageId);
    if (!message) return;

    const panelData = createDynamicTennaiPanel(storeName, attendance, hikakakeLogs);

    await message.edit(panelData);
    logger.info(`✅ ${storeName} の店内状況・客数一覧を更新しました。`);
  } catch (err) {
    logger.error(`❌ ${storeName} の更新中にエラー:`, err);
  }
}

module.exports = { createDynamicTennaiPanel, updateStorePanel };