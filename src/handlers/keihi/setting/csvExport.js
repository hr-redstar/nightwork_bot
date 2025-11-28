// src/handlers/keihi/setting/csvExport.js
// ----------------------------------------------------
// 「経費csv発行」周りの UI ロジック
//   - 店舗選択
//   - 期間選択（日/年月/四半期）
//   - CSV URL をメッセージ出力
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const {
  listKeihiCsvOptions,
  getKeihiCsvUrl,
} = require('./keihiCsvHandler');
const {
  IDS,
  CSV_PERIOD_VALUE_PREFIX,
} = require('./ids');

/**
 * 「経費csv発行」ボタン → 店舗選択
 */
async function handleExportCsvButton(interaction) {
  const guildId = interaction.guild.id;
  let storeRoleConfig;

  try {
    storeRoleConfig = await loadStoreRoleConfig(guildId);
  } catch {
    storeRoleConfig = null;
  }

  const storesObj = storeRoleConfig?.stores || storeRoleConfig || {};
  const entries = Object.entries(storesObj);

  if (!entries.length) {
    await interaction.reply({
      content: '店舗設定がまだありません。先に /設定店舗情報 などで店舗を登録してください。',
      ephemeral: true,
    });
    return;
  }

  const options = entries.slice(0, 25).map(([storeId, store]) => ({
    label: store.name || store.storeName || storeId,
    value: storeId,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_CSV_STORE)
    .setPlaceholder('CSVを発行する店舗を選択')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.reply({
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

  const { dates, months, quarters } = await listKeihiCsvOptions(guildId, storeId);

  if (!dates.length && !months.length && !quarters.length) {
    await interaction.update({
      content: '指定店舗の経費CSVがまだありません。',
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

  // customId: keihi_config:sel:csv_period:{storeId}
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
  const { dates, months, quarters } = await listKeihiCsvOptions(guildId, storeId);
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

  const url = getKeihiCsvUrl(target.filePath);
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

module.exports = {
  handleExportCsvButton,
  handleCsvStoreSelect,
  handleCsvPeriodSelect,
};
