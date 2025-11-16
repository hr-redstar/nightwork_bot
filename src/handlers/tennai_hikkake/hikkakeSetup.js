/**
 * src/handlers/tennai_hikkake/hikkakeSetup.js
 * 「店内状況・ひっかけ」機能のセットアップフローを処理
 */
const { ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const { getStoreList } = require('../../utils/config/configAccessor');
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
  // ここにパネルを実際に投稿するロジックを実装します
  const storeName = interaction.customId.replace('select_channel_for_hikkake_', '');
  const channelId = interaction.values[0];
  await interaction.update({ content: `✅ **${storeName}** のパネルを <#${channelId}> に設置する処理は現在開発中です。`, components: [] });
}

module.exports = {
  handleHikkakeSetup,
  handleStoreSelectForHikkake,
  handleChannelSelectForHikkake,
};