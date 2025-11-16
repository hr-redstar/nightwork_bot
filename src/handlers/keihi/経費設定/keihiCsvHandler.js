// src/handlers/keihi/経費設定/keihiCsvHandler.js
// 経費CSVエクスポート関連のフロー

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { getCsvFileList } = require('../../../utils/keihi/gcsKeihiManager');
const { IDS } = require('./ids');

/**
 * 「経費CSV発行」ボタン押下時のフロー開始
 */
async function openCsvExportFlow(interaction) {
  const guildId = interaction.guild.id;
  const storeData = await loadStoreRoleConfig(guildId);
  const stores = storeData?.stores || [];

  if (!stores.length) {
    return interaction.followUp({
      content: '⚠️ 店舗情報が登録されていません。/設定 コマンドから店舗を登録してください。',
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId('keihi:select:store:csv') // CSVフロー用のカスタムID
    .setPlaceholder('店舗を選択してください')
    .addOptions(
      stores.map((s) => ({
        label: s.name || s,
        value: s.id || s,
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.followUp({
    content: '🏪 経費CSVを発行する店舗を選択してください。',
    components: [row],
    ephemeral: true,
  });
}

async function handleStoreSelect(interaction) {
  const storeId = interaction.values[0];
  const scopeMenu = new StringSelectMenuBuilder()
    .setCustomId(`keihi:select:csvscope:${storeId}`)
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
  const storeId = interaction.customId.split(':')[3];
  const csvFiles = await getCsvFileList(guildId, storeId);

  if (!csvFiles.length) {
    return interaction.update({
      content: `⚠️ **${storeId}** のCSVファイルが見つかりません。`,
      components: [],
    });
  }

  // 範囲タイプごとにフィルタ
  const scope = interaction.values[0];
  let filtered = [];
  if (scope === 'daily') {
    filtered = csvFiles.filter((f) => f.match(/_\d{8}\.csv$/));
  } else if (scope === 'monthly') {
    filtered = csvFiles.filter((f) => f.match(/_\d{6}\.csv$/));
  } else if (scope === 'quarterly') {
    filtered = csvFiles.filter((f) => f.match(/_Q\d\.csv$/));
  }

  if (!filtered.length) {
    return interaction.update({
      content: `⚠️ **${storeId}** に選択された範囲のCSVファイルが見つかりません。`,
      components: [],
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`keihi:select:csvfile:${storeId}`)
    .setPlaceholder('CSVファイルを選択してください')
    .addOptions(
      filtered.slice(0, 25).map((f) => ({
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
  const storeId = interaction.customId.split(':')[3];
  const fileName = interaction.values[0];
  const filePath = `GCS/${guildId}/keihi/${storeId}/${fileName}`;

  try {
    await interaction.update({
      content: `📦 **${storeId}** の経費CSVを送信します。\nファイル名：\`${fileName}\``,
      files: [filePath],
      components: [],
    });
  } catch (err) {
    console.error('❌ 経費CSV添付エラー:', err);
    await interaction.followUp({
      content: '⚠️ CSVファイルの送信に失敗しました。ファイルが存在するか確認してください。',
      ephemeral: true,
    });
  }
}

/**
 * CSVエクスポートの選択処理
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleCsvExportSelection(interaction) {
  const id = interaction.customId;
  if (id.startsWith('keihi:select:store:csv')) return handleStoreSelect(interaction);
  if (id.startsWith('keihi:select:csvscope:')) return handleScopeSelect(interaction);
  if (id.startsWith('keihi:select:csvfile:')) return handleFileSelect(interaction);
}

module.exports = { openCsvExportFlow, handleCsvExportSelection };