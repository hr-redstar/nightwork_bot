// src/handlers/config/components/select/user/select_user_chooseMember.js
// ----------------------------------------------------
// Step1：情報を登録するユーザーを選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  UserSelectMenuBuilder,
} = require('discord.js');

const nextStep = require('./select_user_chooseStore.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_MEMBER',

  async show(interaction) {
    const menu = new UserSelectMenuBuilder()
      .setCustomId('CONFIG_USER_SELECT_MEMBER')
      .setPlaceholder('ユーザーを選択してください')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '👤 情報を登録するユーザーを選択してください。',
      components: [row],
      ephemeral: true,
    });
  },

  async handle(interaction) {
    const userId = interaction.values[0];
    return nextStep.show(interaction, userId);
  },
};
