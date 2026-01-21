// src/handlers/config/components/select/select_position_choose.js
// ----------------------------------------------------
// Step1：紐づけ対象の「役職」を選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const nextStep = require('./select_position_roles.js');

module.exports = {
  customId: 'config_select_position',

  async show(interaction) {
    const config = await loadStoreRoleConfig(interaction.guild.id);
    const positions = config.roles; // [{id,name}]

    if (!positions.length) {
      const { MessageFlags } = require('discord.js');
      return interaction.reply({
        content: '⚠️ 先に役職を登録してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('config_select_position')
      .setPlaceholder('対象の役職を選択してください')
      .addOptions(
        positions.map((p) => ({
          label: p.name,
          value: p.id,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const { MessageFlags } = require('discord.js');

    await interaction.reply({
      content: '👔 ロールを紐づける **役職** を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },

  async handle(interaction) {
    const positionId = interaction.values[0];
    return nextStep.show(interaction, positionId);
  },
};
