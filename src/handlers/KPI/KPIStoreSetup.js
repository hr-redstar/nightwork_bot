/**
 * src/handlers/KPI/KPIStoreSetup.js
 * KPI設置フロー：店舗 → チャンネル選択 → パネル送信
 */

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { postOrUpdateKpiStorePanel } = require('./KPIPanel_Store');

/**
 * KPI設置ボタン押下時
 */
async function handleKpiSetup(interaction) {
  const { guildId } = interaction;

  // 1️⃣ 店舗リストを取得
  const config = await getGuildConfig(guildId);
  // 店舗名のソースは config.stores（なければKPIキー一覧を候補に）
  const storeList = Array.isArray(config?.stores) && config.stores.length
    ? config.stores
    : Object.keys(config?.KPI || {});

  if (!storeList.length) {
    return await interaction.reply({
      content: '⚠️ 店舗が登録されていません。「/設定」で店舗を登録してください。',
      flags: MessageFlags.Ephemeral
    });
  }

  // 2️⃣ 店舗選択メニューを表示
  const storeMenu = new StringSelectMenuBuilder()
    .setCustomId('kpi_select_store')
    .setPlaceholder('店舗を選択してください')
    .addOptions(storeList.map((store) => ({ label: store, value: store })));

  const row = new ActionRowBuilder().addComponents(storeMenu);

  await interaction.reply({
    content: '🏪 KPIを設置する店舗を選択してください。',
    components: [row],
    flags: MessageFlags.Ephemeral
  });
}

/**
 * 店舗選択 → チャンネル選択処理
 */
async function handleStoreSelect(interaction) {
  const storeName = interaction.values[0];
  const channelMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`kpi_select_channel_${storeName}`)
    .setPlaceholder('KPIパネルを置くテキストチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelMenu);

  await interaction.update({
    content: `🏪 **${storeName}** にKPIを設置するチャンネルを選択してください。`,
    components: [row],
  });
}

/**
 * チャンネル選択完了 → KPIパネル送信
 */
async function handleChannelSelect(interaction) {
  const customId = interaction.customId;
  const storeName = customId.replace('kpi_select_channel_', '');
  const targetChannel = interaction.channels.first();

  if (!targetChannel) {
    return await interaction.reply({
      content: '⚠️ チャンネルが選択されていません。',
      flags: MessageFlags.Ephemeral
    });
  }
  
  // パネル送信
  
  await postOrUpdateKpiStorePanel(targetChannel, storeName);

  // configに保存
  const guildId = interaction.guild.id;
  const config = (await getGuildConfig(guildId)) || {};
  if (!config.KPI) config.KPI = {};
  if (!config.KPI[storeName]) config.KPI[storeName] = {};
  config.KPI[storeName].channelId = targetChannel.id;
  config.KPI[storeName].channelLink = `<#${targetChannel.id}>`;
  await setGuildConfig(guildId, config); 

  // エフェメラルで完了通知 & その場のメニューを消す
  await interaction.update({
    content: `✅ 店舗 **${storeName}** のKPIパネルを ${config.KPI[storeName].channelLink} に設置しました。`,
    components: [],
  });
}

module.exports = {
  handleKpiSetup,
  handleStoreSelect,
  handleChannelSelect,
};
