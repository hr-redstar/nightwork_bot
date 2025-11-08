// src/handlers/tennai_hikkake/tennaiPanel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dayjs = require('dayjs');

/**
 * storeName: 店舗名
 * attendance: 出退勤データ
 * hikakakeLogs: 接客ログ
 */
function createDynamicTennaiPanel(storeName, attendance, hikakakeLogs) {
  // 出退勤で登録されたキャスト数
  const storeAttendance = attendance.filter(a => a.store === storeName);
  const totalPl = storeAttendance.filter(a => a.role === 'プラ').length;
  const totalKama = storeAttendance.filter(a => a.role === 'カマ').length;

  // 接客中キャストを抽出（確定ログのみ）
  const confirmedLogs = hikakakeLogs.filter(h => h.store === storeName && h.type === '確定');
  const currentCastIds = confirmedLogs.flatMap(log => log.castList);

  const currentCustomers = confirmedLogs.reduce((sum, log) => sum + log.num, 0);

  // 空きキャスト数
  const freePl = totalPl - currentCastIds.filter(id => storeAttendance.find(a => a.userId === id && a.role === 'プラ')).length;
  const freeKama = totalKama - currentCastIds.filter(id => storeAttendance.find(a => a.userId === id && a.role === 'カマ')).length;

  // 客数一覧（全ログ）
  const customersList = hikakakeLogs
    .filter(h => h.store === storeName)
    .map(h => ({
      type: h.type === '予定' ? 'ひっかけ予定' : h.type === '確定' ? 'ひっかけ確定' : 'ふらっと来た',
      enterTime: h.enterTime || '-',
      num: h.num,
      group: h.group,
      plan: h.plan || '-',
      cast: h.castList.join(' ') || '-',
      inputUser: h.inputUser,
    }));

  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle(`🏬 店舗: ${storeName}`)
    .setColor('#2b2d31')
    .setTimestamp()
    .setDescription(`📅 ${dayjs().format('YYYY/MM/DD')}\n✨ 接客中: ${currentCustomers}名`);

  // 空きキャスト
  embed.addFields({
    name: '💤 空きキャスト数',
    value: `プラ：${freePl}名　カマ：${freeKama}名`,
    inline: false,
  });

  // 客数一覧
  if (customersList.length > 0) {
    const customersText = customersList
      .map(c => `🚶 ${c.type} 入店:${c.enterTime} 人数:${c.num} 組:${c.group} プラン:${c.plan} 担当:${c.cast} 入力者:${c.inputUser}`)
      .join('\n');
    embed.addFields({ name: '👥 客数一覧', value: customersText, inline: false });
  }

  // ボタン
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mark_hikkake_success').setLabel('🎣 ひっかけ確定').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('mark_hikkake_failed').setLabel('💨 ひっかけ失敗').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('edit_customer_entry').setLabel('✏️ 内容修正').setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [buttonRow] };
}

async function updateStorePanel(client, storeName, attendance, hikakakeLogs, storePanelConfig) {
  try {
    // 設定からチャンネルIDとメッセージIDを取得
    const storeConfig = storePanelConfig[storeName];
    if (!storeConfig) return console.warn(`店舗設定が見つかりません: ${storeName}`);

    const channel = await client.channels.fetch(storeConfig.channelId);
    const message = await channel.messages.fetch(storeConfig.messageId);

    // 最新Embed生成
    const panelData = createDynamicTennaiPanel(storeName, attendance, hikakakeLogs);

    // 既存メッセージを更新
    await message.edit({ embeds: [panelData.embed], components: panelData.components });

    console.log(`✅ ${storeName} の店内状況・客数一覧を更新しました。`);
  } catch (err) {
    console.error(`❌ ${storeName} の更新中にエラー:`, err);
  }
}

module.exports = { createDynamicTennaiPanel, updateStorePanel };