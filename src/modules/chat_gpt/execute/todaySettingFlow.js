// src/handlers/chat_gpt/todaySettingFlow.js

const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { IDS } = require('./ids');
const { buildStoreSelectOptions: buildStoreOptions } = require('../../../utils/config/storeSelectHelper');

// ① ボタン押下 → 店舗リスト表示
async function handleTodaySettingButton(interaction) {
  const guildId = interaction.guild.id;

  const storeOptions = await buildStoreOptions(guildId);

  if (storeOptions.length === 0) {
    await interaction.reply({
      content: '店舗設定が見つかりません。\n先に /設定店舗情報 などで店舗を登録してください。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_TODAY_STORE)
    .setPlaceholder('今日のchat gpt設定を行う店舗を選択してください')
    .addOptions(storeOptions);

  const row = new ActionRowBuilder().addComponents(storeSelect);

  await interaction.reply({
    content: '店舗を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ② 店舗選択後
async function handleTodayStoreSelect(interaction) {
  const guildId = interaction.guild.id;
  const storeName = interaction.values[0];

  logger.info(
    `[todaySettingFlow] 店舗選択: guild=${guildId}, storeName=${storeName}`,
  );

  await interaction.update({
    content: `店舗「${storeName}」が選択されました。この店舗の chat gpt設定を続行します。`,
    components: [],
  });

  // TODO: この後に「テキストチャンネル選択 → モーダル入力」を繋げる
  // 例: await showTodayChannelSelect(interaction, storeName);
}

module.exports = {
  handleTodaySettingButton,
  handleTodayStoreSelect,
};
