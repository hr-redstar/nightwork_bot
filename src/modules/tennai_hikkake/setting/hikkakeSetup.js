/**
 * src/handlers/tennai_hikkake/hikkakeSetup.js
 * 「店内状況・ひっかけ」機能のセットアップフローを処理
 */
const { ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const { getStoreList } = require('../../../utils/config/configAccessor');
const logger = require('../../../utils/logger');
// const { saveHikkakeConfig } = require('../../utils/tennai_hikkake/hikkakeDataManager'); // データマネージャーは別途作成

/**
 * ひっかけ一覧パネルのセットアップを開始
 * @param {import('discord.js').Interaction} interaction
 * @param {{storeOnly: boolean}} options
 */
async function handleHikkakeSetup(interaction, options = {}) {
  const stores = await getStoreList(interaction.guild.id);
  if (!stores || stores.length === 0) {
    return interaction.reply({ content: '⚠️ 店舗が登録されていません。先に「/設定」から店舗を登録してください。', flags: MessageFlags.Ephemeral });
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId('select_store_for_hikkake')
    .setPlaceholder('パネルを設置する店舗を選択してください')
    .addOptions(stores.map(s => ({ label: s, value: s })));

  await interaction.reply({
    content: '🏬 どの店舗の「店内状況・ひっかけ一覧」を設置しますか？',
    components: [new ActionRowBuilder().addComponents(storeSelect)],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 店舗選択後、チャンネル選択メニューを表示
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleStoreSelectForHikkake(interaction) {
  const storeName = interaction.values[0];
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(`select_channel_for_hikkake_${storeName}`)
    .setPlaceholder('パネルを設置するチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  await interaction.update({
    content: `✅ 店舗「**${storeName}**」を選択しました。\n次に、パネルを設置するチャンネルを選択してください。`,
    components: [new ActionRowBuilder().addComponents(channelSelect)],
  });
}

/**
 * チャンネル選択後、パネルを設置
 * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
 */
async function handleChannelSelectForHikkake(interaction) {
  const storeName = interaction.customId.replace('select_channel_for_hikkake_', '');
  const channelId = interaction.values[0];
  const { guild } = interaction;

  // 1. チャンネル取得
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    return interaction.update({ content: '❌ チャンネルが見つかりませんでした。', components: [] });
  }

  // 2. パネル投稿（初期状態）
  // 出退勤データなどは空で作成
  const { createDynamicTennaiPanel } = require('../execute/tennaiPanel');
  const panelData = createDynamicTennaiPanel(storeName, [], []);

  try {
    const message = await channel.send({ embeds: [panelData.embed], components: panelData.components });

    // 3. 設定保存
    const { readHikkakeConfig, saveHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');
    const config = await readHikkakeConfig(guild.id);

    if (!config.panels) config.panels = {};
    config.panels[storeName] = {
      channelId: channel.id,
      messageId: message.id
    };

    await saveHikkakeConfig(guild.id, config);

    await interaction.update({
      content: `✅ 店舗「**${storeName}**」のパネルを <#${channelId}> に設置しました。`,
      components: []
    });

  } catch (error) {
    logger.error('パネル設置エラー:', error);
    await interaction.update({
      content: '❌ パネルの投稿または設定の保存に失敗しました。',
      components: []
    });
  }
}

module.exports = {
  handleHikkakeSetup,
  handleStoreSelectForHikkake,
  handleChannelSelectForHikkake,
};