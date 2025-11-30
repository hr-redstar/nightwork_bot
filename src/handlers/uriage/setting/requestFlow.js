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
} = require('discord.js');

const logger = require('../../../utils/logger');
const { buildStoreSelectOptions } = require('../../../utils/config/storeSelectHelper');
// もし IDS ファイルを使っているならそこから import してもOK
// const { IDS } = require('./ids');

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
      ephemeral: true,
    });
    return;
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('URIAGE_SELECT_STORE_FOR_REPORT_PANEL') // IDS を使うなら差し替え
    .setPlaceholder('売上報告パネルを設置する店舗を選択してください')
    .addOptions(storeOptions);

  const row = new ActionRowBuilder().addComponents(storeSelect);

  await interaction.reply({
    content: '売上報告パネルを設置する店舗を選択してください。',
    components: [row],
    ephemeral: true,
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
    .setCustomId(`URIAGE_SELECT_CHANNEL_FOR_REPORT_PANEL__${storeName}`)
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
      ephemeral: true,
    });
    return;
  }

  // TODO: ここで GCS に「店舗名と売上報告パネルチャンネル」を保存する処理を挟む
  // 例: await saveUriageReportPanelConfig(guildId, { storeName, channelId: channel.id });

  // TODO: 実際に「売上報告パネル 店舗名」をそのチャンネルに送信する処理
  // 例: await postUriageReportPanel(channel, storeName);

  await interaction.update({
    content:
      `店舗「${storeName}」の売上報告パネルを <#${channel.id}> に設置しました。`,
    components: [],
  });

  // TODO: ここで /設定売上 パネル自体を更新する処理があるなら呼ぶ
  // 例: await postUriageSettingPanel(interaction.channel);
}

module.exports = {
  handleUriageReportPanelButton,
  handleUriageStoreSelectForPanel,
  handleUriageChannelSelectForPanel,
};