// src/handlers/keihi/setting/csv.js
// ----------------------------------------------------
// 経費「CSV発行」フロー
//   ボタン -> 店舗選択 -> 種別選択（年月日 / 年月 / 年 / 四半期）
//   -> 期間選択 -> JSON を CSV 化し添付 & URL 表示
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { IDS } = require('./ids');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const {
  listKeihiJsonTargets,
  buildKeihiCsvForPeriod,
} = require('../../../utils/keihi/gcsKeihiManager');
const logger = require('../../../utils/logger');

// ユーザーごとの一時状態: { storeName, rangeType }
const csvStateMap = new Map();

function getStateKey(interaction) {
  const guildId = interaction.guild?.id || 'noguild';
  const userId = interaction.user?.id || 'nouser';
  return `${guildId}:${userId}`;
}

// 店舗一覧を SelectMenu 用に整形（storeRoleConfig の形が不定なのでゆるく対応）
function buildStoreOptions(storeConfig) {
  if (Array.isArray(storeConfig?.stores)) {
    return storeConfig.stores.map((store, index) => {
      const name =
        (store && (store.name ?? store.storeName)) ||
        (typeof store === 'string' ? store : `店舗${index + 1}`);
      return { label: name, value: name };
    });
  }

  if (Array.isArray(storeConfig)) {
    return storeConfig.map((store, index) => {
      const name =
        (store && (store.name ?? store.storeName)) ||
        (typeof store === 'string' ? store : `店舗${index + 1}`);
      return { label: name, value: name };
    });
  }

  return Object.entries(storeConfig || {}).map(([storeId, store]) => {
    const name = store?.name || store?.storeName || storeId;
    return { label: name, value: name };
  });
}

/**
 * 「経費csv発行」ボタン
 */
async function handleExportCsvButton(interaction) {
  const guildId = interaction.guild?.id;
  if (!guildId) {
    return interaction.reply({
      content: 'ギルド情報が取得できませんでした。',
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    const storeConfig = await loadStoreRoleConfig(guildId);
    const storeOptions = buildStoreOptions(storeConfig);

    if (!storeOptions.length) {
      return interaction.reply({
        content: '店舗設定がまだありません。先に「店舗_役職_ロール」を設定してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    // 状態クリア
    csvStateMap.delete(getStateKey(interaction));

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SELECT_STORE_FOR_CSV)
      .setPlaceholder('CSVを発行する店舗を選択してください')
      .addOptions(storeOptions.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: '経費CSVを発行する店舗を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[keihi/csv] handleExportCsvButton エラー', err);
    return interaction.reply({
      content: '経費CSV発行の店舗一覧取得に失敗しました。',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * 店舗選択 / 期間ボタン / 期間選択の dispatcher
 */
async function handleCsvFlowInteraction(interaction) {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === IDS.SELECT_STORE_FOR_CSV) {
        return handleSelectStore(interaction);
      }
      if (interaction.customId === IDS.SELECT_CSV_TARGET) {
        return handleSelectTarget(interaction);
      }
    }

    if (interaction.isButton()) {
      if (
        interaction.customId === IDS.BUTTON_CSV_RANGE_DAILY ||
        interaction.customId === IDS.BUTTON_CSV_RANGE_MONTHLY ||
        interaction.customId === IDS.BUTTON_CSV_RANGE_YEARLY ||
        interaction.customId === IDS.BUTTON_CSV_RANGE_QUARTER
      ) {
        return handleSelectRangeType(interaction);
      }
    }
  } catch (err) {
    logger.error('[keihi/csv] handleCsvFlowInteraction エラー', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '経費CSV発行中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/**
 * 店舗選択
 */
async function handleSelectStore(interaction) {
  const storeName = interaction.values[0];
  const key = getStateKey(interaction);

  csvStateMap.set(key, { storeName });

  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BUTTON_CSV_RANGE_DAILY)
      .setLabel('年月日')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BUTTON_CSV_RANGE_MONTHLY)
      .setLabel('年月')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BUTTON_CSV_RANGE_YEARLY)
      .setLabel('年')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(IDS.BUTTON_CSV_RANGE_QUARTER)
      .setLabel('四半期')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    content: `店舗「${storeName}」の経費CSVを発行します。\n期間の種類を選択してください。`,
    components: [buttonsRow],
  });
}

/**
 * 期間種別選択（年月日/年月/年/四半期）
 */
async function handleSelectRangeType(interaction) {
  const key = getStateKey(interaction);
  const state = csvStateMap.get(key);

  if (!state?.storeName) {
    return interaction.reply({
      content: '先に店舗を選択してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  let rangeType = 'daily';
  let rangeLabel = '年月日';
  if (interaction.customId === IDS.BUTTON_CSV_RANGE_MONTHLY) {
    rangeType = 'monthly';
    rangeLabel = '年月';
  } else if (interaction.customId === IDS.BUTTON_CSV_RANGE_YEARLY) {
    rangeType = 'yearly';
    rangeLabel = '年';
  } else if (interaction.customId === IDS.BUTTON_CSV_RANGE_QUARTER) {
    rangeType = 'quarter';
    rangeLabel = '四半期';
  }

  csvStateMap.set(key, { ...state, rangeType });

  const guildId = interaction.guild.id;
  const targets = await listKeihiJsonTargets(guildId, state.storeName, rangeType);

  if (!targets.length) {
    return interaction.update({
      content: `店舗「${state.storeName}」の${rangeLabel}の経費CSVはまだありません。`,
      components: [],
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(IDS.SELECT_CSV_TARGET)
    .setPlaceholder(`${rangeLabel}を選択してください`)
    .addOptions(
      targets.slice(0, 25).map(label => ({
        label,
        value: label, // ラベル＝ファイルラベル
      })),
    );

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.update({
    content: `店舗「${state.storeName}」の${rangeLabel}の経費CSV対象を選択してください。`,
    components: [row],
  });
}

/**
 * 期間選択後：JSON→CSV を生成し、添付＋URL表示
 */
async function handleSelectTarget(interaction) {
  const key = getStateKey(interaction);
  const state = csvStateMap.get(key);

  if (!state?.storeName || !state?.rangeType) {
    return interaction.reply({
      content: '店舗または期間の情報が失われています。もう一度「経費csv発行」からやり直してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guild.id;
  const label = interaction.values[0]; // YYYY-MM など

  try {
    const { buffer, fileName, publicUrl } = await buildKeihiCsvForPeriod(
      guildId,
      state.storeName,
      state.rangeType,
      label,
    );

    await interaction.update({
      content: [
        `店舗「${state.storeName}」の経費CSVを出力しました。`,
        '',
        `URL: ${publicUrl ?? 'URL 取得に失敗しました'}`,
      ].join('\n'),
      files: [
        {
          attachment: buffer,
          name: fileName || 'keihi.csv',
        },
      ],
      components: [],
    });

    csvStateMap.delete(key);
  } catch (err) {
    logger.error('[keihi/csv] handleSelectTarget CSV生成エラー', err);
    await interaction.update({
      content: 'CSVファイルの取得に失敗しました。',
      components: [],
    });
  }
}

module.exports = {
  handleExportCsvButton,
  handleCsvFlowInteraction,
};
