/**
 * src/handlers/config/configStoreRoleLinkHandler.js
 * 設定：店舗とロールの紐付けフロー
 */
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * 店舗選択メニューを表示する
 * @param {import('discord.js').Interaction} interaction
 */
async function openStoreSelect(interaction) {
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  const stores = config?.stores || [];

  if (!stores.length) {
    return interaction.reply({ content: '⚠️ 店舗がまだ登録されていません。', flags: MessageFlags.Ephemeral });
  }

  const storeMenu = new StringSelectMenuBuilder()
    .setCustomId('select_store_for_role_link') // 他の 'select_store' との競合を避ける
    .setPlaceholder('ロールを紐付ける店舗を選択してください')
    .addOptions(stores.map((s) => ({ label: s, value: s })));

  await interaction.reply({
    content: '🏪 まず、ロールを紐付ける店舗を選択してください。',
    components: [new ActionRowBuilder().addComponents(storeMenu)],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 店舗選択後、ロール選択メニューに更新する
 * @param {import('discord.js').Interaction} interaction
 */
async function showRoleSelectForStore(interaction) {
  const storeName = interaction.values?.[0];
  if (!storeName) {
    return interaction.reply({
      content: '⚠️ 店舗が選択されていません。',
      flags: MessageFlags.Ephemeral,
    });
  }

  // 役職選択メニュー
  const roleMenu = new RoleSelectMenuBuilder()
    .setCustomId(`select_roles_for_store_${storeName}`) // 保存処理のIDと合わせる
    .setPlaceholder('紐づける役職を選択');

  const row = new ActionRowBuilder().addComponents(roleMenu);
  
  await interaction.update({
    content: `🏪 **${storeName}** に紐づける役職を選択してください。`,
    components: [row],
  });
}

module.exports = {
  openStoreSelect,
  showRoleSelectForStore,
};