// src/handlers/uriage/uriageCsvHandler.js
// 売上CSVエクスポート関連のフロー

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getStoreRoleConfig, getCsvFileList } = require('../../utils/uriage/gcsUriageManager');
const { IDS } = require('./ids');

/**
 * 「売上csv発行」ボタン押下時のフロー開始
 */
async function openCsvExportFlow(interaction) {
  const guildId = interaction.guild.id;
  const storeData = await getStoreRoleConfig(guildId);
  const stores = storeData?.stores || storeData?.店舗 || [];

  if (!stores.length) {
    return interaction.followUp({
      content: '⚠️ 店舗情報が登録されていません。GCS/config/店舗_役職_ロール.json を確認してください。',
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${IDS.SEL_STORE}:csv`) // CSVフロー用のカスタムID
    .setPlaceholder('店舗を選択してください')
    .addOptions(
      stores.map((s) => ({
        label: s.name || s,
        value: s.id || s,
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.followUp({
    content: '🏪 売上CSVを発行する店舗を選択してください。',
    components: [row],
    ephemeral: true,
  });
}

async function handleStoreSelect(interaction) {
  const storeId = interaction.values[0];
  const scopeMenu = new StringSelectMenuBuilder()
    .setCustomId(`${IDS.SEL_CSV_SCOPE}:${storeId}`)
    .setPlaceholder('CSVの範囲を選択してください')
    .addOptions([
      { label: '年月日別', value: 'daily' },
      { label: '年月別', value: 'monthly' },
      { label: '四半期別', value: 'quarterly' },
    ]);

  const row = new ActionRowBuilder().addComponents(scopeMenu);

  return interaction.update({
    content: `📅 **${storeId}** のCSV範囲を選択してください。`,
    components: [row],
  });
}

async function handleScopeSelect(interaction) {
  const guildId = interaction.guild.id;
  const storeId = interaction.customId.split(':')[2];
  const csvFiles = await getCsvFileList(guildId, storeId);

  if (!csvFiles.length) {
    return interaction.update({
      content: `⚠️ **${storeId}** のCSVファイルが見つかりません。`,
      components: [],
    });
  }

  // 範囲タイプごとにフィルタ
  let filtered = csvFiles;
  if (interaction.values[0] === 'daily') {
    filtered = csvFiles.filter((f) => f.match(/_\d{8}\.csv$/));
  } else if (interaction.values[0] === 'monthly') {
    filtered = csvFiles.filter((f) => f.match(/_\d{6}\.csv$/));
  } else if (interaction.values[0] === 'quarterly') {
    filtered = csvFiles.filter((f) => f.match(/_Q\d\.csv$/));
  }

  if (!filtered.length) {
    return interaction.update({
      content: `⚠️ **${storeId}** に選択された範囲のCSVファイルが見つかりません。`,
      components: [],
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${IDS.SEL_CSV_FILE}:${storeId}`)
    .setPlaceholder('CSVファイルを選択してください')
    .addOptions(
      filtered.slice(0, 25).map((f) => ({ // 最大25件
        label: f.replace('.csv', ''),
        value: f,
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.update({
    content: `📂 **${storeId}** のCSVファイルを選択してください。`,
    components: [row],
  });
}

async function handleFileSelect(interaction) {
  const guildId = interaction.guild.id;
  const storeId = interaction.customId.split(':')[2];
  const fileName = interaction.values[0];
  const filePath = `GCS/${guildId}/uriage/${storeId}/${fileName}`;

  try {
    await interaction.update({
      content: `📦 **${storeId}** のCSVを送信します。\nファイル名：\`${fileName}\``,
      files: [filePath],
      components: [],
    });
  } catch (err) {
    console.error('❌ CSV添付エラー:', err);
    await interaction.followUp({
      content: '⚠️ CSVファイルの送信に失敗しました。ファイルが存在するか確認してください。',
      ephemeral: true,
    });
  }
}

/**
 * 店舗選択 → 範囲選択（年月日 / 年月 / 四半期）
 */
async function handleCsvExportSelection(interaction) {
  // ステップ1: 店舗選択
  if (interaction.customId.startsWith(`${IDS.SEL_STORE}:csv`)) return handleStoreSelect(interaction);

  // ステップ2: 範囲選択 → CSVファイル一覧を取得
  if (interaction.customId.startsWith(IDS.SEL_CSV_SCOPE)) return handleScopeSelect(interaction);

  // ステップ3: CSVファイル選択 → 添付返信
  if (interaction.customId.startsWith(IDS.SEL_CSV_FILE)) return handleFileSelect(interaction);
}

module.exports = { openCsvExportFlow, handleCsvExportSelection };