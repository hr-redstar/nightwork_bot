// src/handlers/uriage/setting/requestFlow.js
// ----------------------------------------------------
// 売上「売上報告パネル」設定フロー
//   - 売上報告パネル設置ボタン → 店舗セレクト
//   - 店舗セレクト → チャンネルセレクト
//   - チャンネルセレクト → パネル設置（＋設定保存）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { buildStoreSelectOptions } = require('../../../utils/config/storeSelectHelper');
const {
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('../../../utils/uriage/gcsUriageManager');
const { postUriageReportPanel } = require('../report/reportPanel');
const { IDS } = require('./ids');

/**
 * 「売上報告パネル設置」ボタン押下 → 店舗リスト表示
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleUriageReportPanelButton(interaction) {
  const guildId = interaction.guild.id;

  const storeOptions = await buildStoreSelectOptions(guildId);

  if (storeOptions.length === 0) {
    await interaction.reply({
      content:
        '店舗設定が見つかりません。\n' +
        '先に `/設定店舗情報` などで店舗を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(IDS.SELECT_STORE_FOR_PANEL) // IDS を使うなら差し替え
    .setPlaceholder('売上報告パネルを設置する店舗を選択してください')
    .addOptions(storeOptions);

  const row = new ActionRowBuilder().addComponents(storeSelect);

  await interaction.reply({
    content: '売上報告パネルを設置する店舗を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 店舗セレクト後 → テキストチャンネル選択
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleUriageStoreSelectForPanel(interaction) {
  const storeName = interaction.values[0];
  const guild = interaction.guild;

  logger.info(
    `[uriage/requestFlow] 売上報告パネル 店舗選択: guild=${guild.id}, storeName=${storeName}`,
  );

  // この後はチャンネルセレクトへ
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`${IDS.SELECT_CHANNEL_FOR_PANEL}:${storeName}`)
    .setPlaceholder('売上報告パネルを設置するテキストチャンネルを選択してください')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.update({
    content: `店舗「${storeName}」の売上報告パネルを設置するチャンネルを選択してください。`,
    components: [row],
  });
}

/**
 * チャンネルセレクト後 → 実際にパネル設置（＋設定保存など）
 * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
 */
async function handleUriageChannelSelectForPanel(interaction) {
  const [_, storeName] = interaction.customId.split('__'); // "URIAGE_SELECT_CHANNEL_FOR_REPORT_PANEL__店舗名"

  const channel = interaction.channels.first();
  if (!channel) {
    await interaction.reply({
      content: 'チャンネルが選択されていません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();

  try {
    const guildId = interaction.guild.id;

    // ① 店舗別 config を読み込み、パネル情報を保存
    const config = await loadUriageStoreConfig(guildId, storeName);
    config.reportPanelChannelId = channel.id;
    // 実際のメッセージIDは下の postUriageReportPanel で取得したら更新
    await saveUriageStoreConfig(guildId, storeName, config);

    // ② 「売上報告パネル 店舗名」をそのチャンネルに送信
    const panelMessage = await postUriageReportPanel(channel, storeName);

    // ③ パネルメッセージIDを保存
    config.reportPanelMessageId = panelMessage.id;
    await saveUriageStoreConfig(guildId, storeName, config);

    logger.info(
      `[uriage/requestFlow] 売上報告パネル設置完了: guild=${guildId}, store=${storeName}, ch=${channel.id}, msg=${panelMessage.id}`,
    );

    await interaction.followUp({
      content: `✅ 店舗「${storeName}」の売上報告パネルを <#${channel.id}> に設置しました。`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[uriage/requestFlow] パネル設置エラー:', err);
    await interaction.followUp({
      content: '売上報告パネルの設置に失敗しました。',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = {
  handleUriageReportPanelButton,
  handleUriageStoreSelectForPanel,
  handleUriageChannelSelectForPanel,
};