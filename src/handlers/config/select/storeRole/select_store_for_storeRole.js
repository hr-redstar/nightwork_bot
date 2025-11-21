// ----------------------------------------------------
// 店舗 → ロール紐づけ：店舗選択 Step1
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager.js');

module.exports = {
  customId: 'CONFIG_SELECT_STORE_FOR_STORE_ROLE',

  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    if (!config.stores?.length) {
      return interaction.reply({
        content: '⚠️ 店舗が登録されていません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('CONFIG_SELECT_STORE_FOR_STORE_ROLE_VALUE')
      .setPlaceholder('ロールを紐づける店舗を選択')
      .addOptions(config.stores.map(store => ({
        label: store,
        value: store
      })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: '🏪 ロールを紐づける **店舗** を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  async handle(interaction) {
    const storeName = interaction.values[0];

    const next = require('./select_roles_for_store');
    return next.show(interaction, storeName);
  }
};
