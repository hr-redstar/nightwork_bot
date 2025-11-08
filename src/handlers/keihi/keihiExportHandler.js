const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require('discord.js');
const logger = require('../../utils/logger'); // loggerをインポート
const { loadKeihiConfig, readKeihiDaily } = require('../../utils/keihi/keihiConfigManager');

/**
 * 経費CSV出力ボタン押下 → 年月選択メニュー表示
 */
async function handleKeihiCsvExport(interaction) {
  const now = dayjs();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = now.subtract(i, 'month');
    months.push({
      label: `${d.format('YYYY年MM月')}`,
      value: d.format('YYYY-MM'),
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('keihi_csv_select_month')
    .setPlaceholder('CSV出力する年月を選択してください')
    .addOptions(months);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
    content: '📊 経費CSVを出力する年月を選んでください。',
    components: [row],
    ephemeral: true,
  });
}

/**
 * 年月選択後 → CSV生成
 */
async function handleKeihiCsvSelect(interaction) {
  const guild = interaction.guild;
  const guildId = interaction.guild.id;
  const selected = interaction.values[0]; // 例: 2025-11
  const [year, month] = selected.split('-');
  const config = await loadKeihiConfig(guildId);

  const resultEmbeds = [];
  const attachments = [];

  try {
    // 店舗ごとにCSVを生成
    for (const [storeName, chId] of Object.entries(config.stores || {})) {
      const data = [];
      const daysInMonth = dayjs(selected).daysInMonth();

      // 1ヶ月分の日次データをすべて読み込む
      for (let i = 1; i <= daysInMonth; i++) {
        const day = i.toString().padStart(2, '0');
        try {
          const dailyData = await readKeihiDaily(guildId, storeName, year, month, day);
          if (dailyData.length > 0) {
            data.push(...dailyData.filter(entry => entry.status === 'approved')); // 承認済みの項目のみをCSV出力対象とする
          }
        } catch (readErr) {
          // ファイルが存在しない場合はスキップ
          if (!readErr.message.includes('ENOENT'))
            console.error(`経費データ読み込みエラー (${storeName}, ${year}-${month}-${day}):`, readErr);
        }
      }

      if (data.length === 0) continue;

      // 店舗ごとの経費項目一覧を取得
      const items = config.storeItems?.[storeName] || [];

      // CSV生成
      const csvHeader = '日付,部署,経費項目,金額,備考,入力者,入力時間,ステータス\n';
      const csvBody = data
        .map(
          e =>
            `${e.date},${e.department || ''},${e.item},${e.amount},"${(e.note || '').replace(/"/g, '""')}",${e.applicant},${e.createdAt},${e.status || ''}`,
        )
        .join('\n');

      // 項目別合計
      const summary = {};
      for (const item of items) summary[item] = 0;
      for (const e of data) {
        if (summary[e.item] !== undefined) summary[e.item] += e.amount;
        else summary[e.item] = e.amount;
      }

      const total = Object.values(summary).reduce((a, b) => a + b, 0);

      // 結果Embed
      const embed = new EmbedBuilder()
        .setColor('#2b6cb0')
        .setTitle(`📊 経費集計（${storeName}）${year}年${month}月`)
        .setDescription(`出力データ件数：${data.length}件`)
        .addFields(
          ...Object.entries(summary).map(([k, v]) => ({
            name: k,
            value: `${v.toLocaleString()} 円`,
            inline: true,
          })),
          { name: '💰 合計', value: `${total.toLocaleString()} 円`, inline: false },
        )
        .setFooter({ text: `ファイル名：${storeName}_${year}${month}.csv` });
      
      attachments.push(new AttachmentBuilder(Buffer.from(csvHeader + csvBody, 'utf-8'), {
        name: `${storeName}_${year}${month}.csv`,
      }));
      resultEmbeds.push(embed);
    }

    // 出力結果
    if (resultEmbeds.length === 0) {
      return interaction.reply({
        content: `⚠️ ${year}年${month}月 の経費データが見つかりません。`,
        ephemeral: true,
      });
    }

    // ✅ 管理者ログにも出力
    if (config.logChannelId) {
      const logCh = guild.channels.cache.get(config.logChannelId);
      if (logCh && logCh.isTextBased()) {
        await logCh.send({ content: `📄 ${year}年${month}月の経費CSVが出力されました。`, embeds: resultEmbeds, files: attachments });
      }
    }

    await interaction.reply({
      content: `✅ ${year}年${month}月 の経費CSVを店舗別に出力しました。`,
      embeds: resultEmbeds,
      files: attachments,
      ephemeral: true,
    });
  } catch (err) {
    logger.error('❌ 経費CSV出力エラー:', err);
    await interaction.reply({
      content: '⚠️ 経費CSV出力中にエラーが発生しました。',
      ephemeral: true,
    });
  }
}

module.exports = { handleKeihiCsvExport, handleKeihiCsvSelect };