// src/handlers/syut/syutCsv.js
const { ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getStoreList } = require('../../../utils/config/configAccessor');
const { getMonthlySyuttaikin } = require('../../../utils/syut/syutConfigManager');

/**
 * CSV出力フローを開始（店舗選択）
 * @param {import('discord.js').Interaction} interaction
 */
async function startCsvExport(interaction) {
  const stores = await getStoreList(interaction.guild.id);
  if (!stores.length) {
    return interaction.reply({ content: '⚠️ 店舗が未登録です。', flags: MessageFlags.Ephemeral });
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('syut_csv_store_select')
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map(s => ({ label: s, value: s })));

  await interaction.reply({
    content: 'CSVを出力する店舗を選択してください。',
    components: [new ActionRowBuilder().addComponents(storeSelect)],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 店舗選択後、年月選択メニューを表示
 * @param {import('discord.js').Interaction} interaction
 * @param {string} storeName
 */
async function selectMonth(interaction, storeName) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const monthSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_csv_month_select:${storeName}`)
    .setPlaceholder('年月を選択')
    .addOptions(months);

  await interaction.update({
    content: `**${storeName}** のCSVを出力する年月を選択してください。`,
    components: [new ActionRowBuilder().addComponents(monthSelect)],
  });
}

/**
 * 年月選択後、CSVを生成して送信
 * @param {import('discord.js').Interaction} interaction
 */
async function outputCsv(interaction) {
  const [storeName, yearMonth] = interaction.customId.split(':')[1].split('_');
  const [year, month] = yearMonth.split('-');

  const data = await getMonthlySyuttaikin(interaction.guild.id, storeName, year, month);
  if (!data || (!data.castSummary?.length && !data.kurofukuSummary?.length)) {
    return interaction.update({ content: `⚠️ **${storeName}** の${year}年${month}月のデータが見つかりません。`, components: [] });
  }

  // CSV生成ロジック（簡易版）
  let csvContent = '種別,名前,出勤日数,総労働時間\n';
  data.castSummary.forEach(d => {
    csvContent += `キャスト,${d.name},${d.days},${d.hours}\n`;
  });
  data.kurofukuSummary.forEach(d => {
    csvContent += `黒服,${d.name},${d.days},${d.hours}\n`;
  });

  const attachment = new AttachmentBuilder(Buffer.from(csvContent, 'utf-8'), {
    name: `出退勤_${storeName}_${year}${month}.csv`,
  });

  await interaction.update({
    content: `✅ **${storeName}** の${year}年${month}月分のCSVファイルを生成しました。`,
    files: [attachment],
    components: [],
  });
}

module.exports = { startCsvExport, selectMonth, outputCsv };