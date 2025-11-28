// src/handlers/uriage/setting/csv.js
// 売上CSVエクスポート関連のフロー

const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { listUriageCsvOptions, getUriageCsvUrl } = require('../../../utils/uriage/uriageCsvManager');
const logger = require('../../../utils/logger');
const { IDS, CSV_PERIOD_VALUE_PREFIX } = require('./ids');

/**
 * 「売上csv発行」ボタン → 店舗選択
 */
async function openCsvExportFlow(interaction) {
  const storeData = await loadStoreRoleConfig(interaction.guild.id);
  const stores = storeData?.stores || [];

  if (!stores.length) {
    return interaction.followUp({
      content: '⚠️ 店舗情報が登録されていません。GCS/config/店舗_役職_ロール.json を確認してください。',
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_CSV_STORE)
    .setPlaceholder('店舗を選択してください')
    .addOptions(
      stores.map((s) => ({
        label: s.name,
        value: s.id,
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.followUp({
    content: 'CSVを発行する店舗を選択してください。',
    components: [row],
    ephemeral: true,
  });
}

/**
 * 店舗選択 → CSV 期間選択（1つのセレクトに日/月/四半期をまとめる）
 */
async function handleCsvStoreSelect(interaction) {
  const guildId = interaction.guild.id;
  const storeId = interaction.values[0];

  const { dates, months, quarters } = await listUriageCsvOptions(guildId, storeId);

  if (!dates.length && !months.length && !quarters.length) {
    await interaction.update({
      content: '指定店舗の売上CSVがまだありません。',
      components: [],
    });
    return;
  }

  const options = [];

  dates.forEach((d) =>
    options.push({
      label: `【日別】${d.label}`,
      value: CSV_PERIOD_VALUE_PREFIX.DATE + d.key,
      description: d.filePath,
    }),
  );
  months.forEach((m) =>
    options.push({
      label: `【月別】${m.label}`,
      value: CSV_PERIOD_VALUE_PREFIX.MONTH + m.key,
      description: m.filePath,
    }),
  );
  quarters.forEach((q) =>
    options.push({
      label: `【四半期】${q.label}`,
      value: CSV_PERIOD_VALUE_PREFIX.QUARTER + q.key,
      description: q.filePath,
    }),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${IDS.SEL_CSV_PERIOD}:${storeId}`) // storeId を customId に埋め込む
    .setPlaceholder('出力する期間を選択してください')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options.slice(0, 25));

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.update({
    content: `店舗「${storeId}」のCSV期間を選択してください。`,
    components: [row],
  });
}

/**
 * 期間選択 → CSV URL をメッセージ出力
 * ※ 実ファイル添付まではせず、「URL + 種別」メッセージを出す形
 */
async function handleCsvPeriodSelect(interaction) {
  const guildId = interaction.guild.id;

  // customId: uriage:setting:select:csv_period:{storeId}
  const id = interaction.customId;
  const parts = id.split(':');
  const storeId = parts[parts.length - 1];

  const raw = interaction.values[0]; // e.g. "date:2024-11-01"
  let kind = 'date';
  let key = raw;

  if (raw.startsWith(CSV_PERIOD_VALUE_PREFIX.DATE)) {
    kind = 'date';
    key = raw.slice(CSV_PERIOD_VALUE_PREFIX.DATE.length);
  } else if (raw.startsWith(CSV_PERIOD_VALUE_PREFIX.MONTH)) {
    kind = 'month';
    key = raw.slice(CSV_PERIOD_VALUE_PREFIX.MONTH.length);
  } else if (raw.startsWith(CSV_PERIOD_VALUE_PREFIX.QUARTER)) {
    kind = 'quarter';
    key = raw.slice(CSV_PERIOD_VALUE_PREFIX.QUARTER.length);
  }

  // 再度 options を取得して filepath を確定
  const { dates, months, quarters } = await listUriageCsvOptions(guildId, storeId);
  let list = [];
  if (kind === 'date') list = dates;
  else if (kind === 'month') list = months;
  else list = quarters;

  const target = list.find((x) => x.key === key);
  if (!target) {
    await interaction.update({
      content: '対応するCSVファイルが見つかりませんでした。',
      components: [],
    });
    return;
  }

  const url = getUriageCsvUrl(target.filePath);
  const kindLabel =
    kind === 'date' ? '日別' : kind === 'month' ? '月別' : '四半期';

  const contentLines = [
    `店舗ID: ${storeId}`,
    `種別: ${kindLabel}`,
    `期間: ${target.label}`,
  ];

  if (url) {
    contentLines.push(`CSV URL: ${url}`);
  } else {
    contentLines.push('CSV URL の取得に失敗しました。（権限 / 公開設定を確認してください）');
  }

  await interaction.update({
    content: contentLines.join('\n'),
    components: [],
  });
}

/**
 * 店舗選択 → 範囲選択（年月日 / 年月 / 四半期）
 */
async function handleCsvExportSelection(interaction) {
  // ステップ1: 店舗選択
  if (interaction.customId === IDS.SEL_CSV_STORE) return handleCsvStoreSelect(interaction);

  // ステップ2: 期間選択 → CSV URL を出力
  if (interaction.customId.startsWith(IDS.SEL_CSV_PERIOD)) return handleCsvPeriodSelect(interaction);
}

module.exports = {
  openCsvExportFlow,
  handleCsvExportSelection,
};