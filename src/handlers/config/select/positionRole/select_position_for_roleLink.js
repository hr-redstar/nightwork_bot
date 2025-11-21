// 役職とロール紐づけ - Step1 役職選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');

const nextStep = require('./select_roles_for_position.js');

module.exports = {
  customId: 'CONFIG_SELECT_POSITION_FOR_ROLE_LINK',

  /**
   * 役職選択メニューを表示
   */
  async show(interaction) {
    const guildId = interaction.guild.id;
    const config = await loadStoreRoleConfig(guildId);

    if (!config.roles?.length) {
      return interaction.reply({
        content: '⚠️ 役職が登録されていません。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('CONFIG_SELECT_POSITION_FOR_ROLE_LINK_VALUE')
      .setPlaceholder('ロールを紐づける役職を選択')
      .addOptions(
        config.roles.map((role) => ({
          label: role.name,
          value: role.id,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '👔 ロールを紐づける **役職** を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  /**
   * 選択後 → Step2 へ
   */
  async handle(interaction) {
    const positionId = interaction.values[0];
    return nextStep.show(interaction, positionId);
  },
};
