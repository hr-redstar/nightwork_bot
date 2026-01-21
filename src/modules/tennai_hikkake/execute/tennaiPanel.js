// src/handlers/tennai_hikkake/tennaiPanel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dayjs = require('dayjs');

/**
 * storeName: 店舗名
 * attendance: 出退勤データ (dailySyuttaikin.cast array)
 * hikakakeLogs: 接客ログ
 */
function createDynamicTennaiPanel(storeName, attendance, hikakakeLogs) {
  // 1. 出勤キャスト総数
  const totalCast = attendance ? attendance.length : 0;

  // 2. 接客中キャスト数 (確定ログの castList に含まれるユニークなID数)
  //    ※ 現状 hikkakeReport.js では castList は空なので、単に組数や人数で判断など
  //    ※ 仕様上 "キャスト連携" があるので、本来は log.castList に誰がついたかが入るべき。
  //    ※ しかし今はまだ選択機能がないので、あくまで「ひっかけ確定」の数などで推測するしかないが、
  //    ※ User Requestでは「空きキャスト数」を求めているので、
  //    ※ 「手動登録」や「出退勤」から「確定ログの人数」を引くロジックにする？
  //    ※ ひとまず "activeHikkakeCasts" は正確には出せないため、
  //    ※ 「人数: XX名」だけ出すか、あるいは「出勤 - 接客中組数」などで簡易計算するか。
  //    ※ ここでは「接客中客数」を表示し、「空きキャスト」は (出勤数 - 接客中人数) と仮定する。(1対1と仮定)

  const confirmedLogs = hikakakeLogs.filter(h => h.store === storeName && h.type === '確定');

  // 今入っているお客さんの総数
  const currentCustomers = confirmedLogs.reduce((sum, log) => sum + log.num, 0);

  // 簡易計算: 空きキャスト = 出勤総数 - 客総数 (マイナスにならないように)
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

  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle(`🏬 店舗: ${storeName}`)
    .setColor('#2b2d31')
    .setTimestamp()
    .setDescription(`📅 ${dayjs().format('YYYY/MM/DD')}`);

  // フィールド
  embed.addFields(
    { name: '✨ 接客中', value: `${currentCustomers}名`, inline: true },
    { name: '👯 出勤キャスト', value: `${totalCast}名`, inline: true },
    { name: '💤 空きキャスト', value: `${freeCast}名`, inline: true },
  );

  // 客数一覧
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

    // 長さ対策
    const truncatedText = customersText.length > 1000 ? customersText.substring(0, 1000) + '...' : customersText;
    embed.addFields({ name: '👥 客数一覧', value: truncatedText, inline: false });
  } else {
    embed.addFields({ name: '👥 客数一覧', value: 'データなし', inline: false });
  }

  // ボタン (IDに店舗名を埋め込む)
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hikkake_report_plan:${storeName}`).setLabel('🐟 ひっかけ予定').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`hikkake_report_failed:${storeName}`).setLabel('💨 ひっかけ失敗').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`hikkake_report_edit:${storeName}`).setLabel('✏️ 内容修正').setStyle(ButtonStyle.Secondary),
  );

  const buttonRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`hikkake_report_success:${storeName}`).setLabel('🎣 ひっかけ確定').setStyle(ButtonStyle.Success)
  );

  return { embed, components: [buttonRow, buttonRow2] };
}

async function updateStorePanel(client, storeName, attendance, hikakakeLogs, storePanelConfig) {
  try {
    const storeConfig = storePanelConfig[storeName];
    if (!storeConfig) return console.warn(`店舗設定が見つかりません: ${storeName}`);

    const channel = await client.channels.fetch(storeConfig.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(storeConfig.messageId);
    if (!message) return;

    const panelData = createDynamicTennaiPanel(storeName, attendance, hikakakeLogs);

    await message.edit({ embeds: [panelData.embed], components: panelData.components });
    console.log(`✅ ${storeName} の店内状況・客数一覧を更新しました。`);
  } catch (err) {
    console.error(`❌ ${storeName} の更新中にエラー:`, err);
  }
}

module.exports = { createDynamicTennaiPanel, updateStorePanel };