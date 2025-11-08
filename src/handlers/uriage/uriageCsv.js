const { AttachmentBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { readFileFromGCS, listFilesInDirectory } = require('../../utils/gcs');
const { getStoreList } = require('../../utils/config/configAccessor');
const path = require('path');

/**
 * CSV発行ワークフロー開始（店舗選択）
 */
async function handleCsvStart(interaction) {
  const guildId = interaction.guild.id;
  const stores = await getStoreList(guildId);
  if (stores.length === 0) {
    return interaction.reply({ content: '⚠️ 店舗が登録されていません。', ephemeral: true });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('uriage_csv_store_select')
    .setPlaceholder('店舗を選択')
    .addOptions(stores.map((s) => ({ label: s, value: s })));

  await interaction.reply({
    content: '📊 CSVを発行する店舗を選択してください。',
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  });
}

/**
 * 店舗選択後：期間タイプ選択
 */
async function handleCsvTypeSelect(interaction, storeName) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`uriage_csv_type_${storeName}`)
    .setPlaceholder('期間タイプを選択')
    .addOptions([
      { label: '年月日（1日分）', value: 'day' },
      { label: '年月（月別）', value: 'month' },
      { label: '四半期（3ヶ月分）', value: 'quarter' },
    ]);

  await interaction.update({
    content: `🏪 店舗：${storeName}\n期間タイプを選択してください。`,
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

/**
 * CSV一覧選択
 */
async function handleCsvFileSelect(interaction, storeName, type) {
  const guildId = interaction.guild.id;
  const basePath = `GCS/${guildId}/uriage/${storeName}/`;
  const files = await listFilesInDirectory(basePath);

  if (!files || files.length === 0)
    return interaction.update({
      content: '⚠️ CSVファイルが見つかりません。',
      components: [],
    });

  // ファイル名の中から対象タイプのものだけ抽出
  let filtered = [];
  if (type === 'day') {
    filtered = files.filter((f) => f.includes('売上報告_20'));
  } else if (type === 'month') {
    filtered = Array.from(
      new Set(
        files
          .filter((f) => f.includes('売上報告_'))
          .map((f) => f.match(/売上報告_(\d{4}-\d{2})/)[1])
      )
    );
  } else if (type === 'quarter') {
    const monthsToQuarter = (m) => Math.floor((parseInt(m) - 1) / 3) + 1;
    const quarters = new Set();
    for (const f of files.filter((f) => f.includes('売上報告_'))) {
      const m = f.match(/売上報告_(\d{4})-(\d{2})/);
      if (m) quarters.add(`${m[1]}-Q${monthsToQuarter(m[2])}`);
    }
    filtered = Array.from(quarters);
  }

  if (filtered.length === 0)
    return interaction.update({ content: '⚠️ 該当する期間のCSVがありません。', components: [] });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`uriage_csv_file_${storeName}_${type}`)
    .setPlaceholder('CSV期間を選択')
    .addOptions(filtered.slice(0, 25).map((label) => ({ label, value: label })));

  await interaction.update({
    content: `🏪 店舗：${storeName}\n期間タイプ：${type}\n発行対象を選択してください。`,
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

/**
 * CSV出力・添付送信
 */
async function handleCsvOutput(interaction, storeName, type, value) {
  const guildId = interaction.guild.id;
  const basePath = `GCS/${guildId}/uriage/${storeName}/`;
  let filePath = '';

  if (type === 'day') {
    filePath = `${basePath}売上報告_${value}.csv`;
  } else if (type === 'month') {
    filePath = `${basePath}${value}/売上報告_${value}.csv`;
  } else if (type === 'quarter') {
    // 四半期：対象3ヶ月分をマージして1ファイルにまとめる
    const [year, quarterStr] = value.split('-Q');
    const quarter = parseInt(quarterStr);
    const months = [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, (quarter - 1) * 3 + 3].map((m) =>
      String(m).padStart(2, '0')
    );
    let mergedData = 'date,store,user,approver,status\n';
    for (const m of months) {
      const files = await listFilesInDirectory(`${basePath}${year}/${m}/`);
      const match = files.find((f) => f.includes('売上報告_'));
      if (match) {
        const data = await readFileFromGCS(`${basePath}${year}/${m}/${match}`);
        if (data) mergedData += data + '\n';
      }
    }
    const attachment = new AttachmentBuilder(Buffer.from(mergedData, 'utf8')).setName(
      `売上報告_${value}.csv`
    );
    return interaction.update({
      content: `📎 **${storeName}** の **${value}** 四半期CSVを出力しました。`,
      files: [attachment],
      components: [],
    });
  }

  const data = await readFileFromGCS(filePath);
  if (!data)
    return interaction.update({
      content: '⚠️ CSVファイルが見つかりません。',
      components: [],
    });

  const attachment = new AttachmentBuilder(Buffer.from(data, 'utf8')).setName(
    path.basename(filePath)
  );

  await interaction.update({
    content: `📎 **${storeName}** のCSVを出力しました。\nURL: \`${filePath}\``,
    files: [attachment],
    components: [],
  });
}

module.exports = {
  handleCsvStart,
  handleCsvTypeSelect,
  handleCsvFileSelect,
  handleCsvOutput,
};
