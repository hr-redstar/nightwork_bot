// src/commands/設定売上.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendSalesSettingsPanel } = require('../handlers/uriage/uriagePanel_Config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定売上')
    .setDescription('売上設定パネルを表示します（管理者向け）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await sendSalesSettingsPanel(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '売上設定パネルの表示に失敗しました。', flags: MessageFlags.Ephemeral });
    }
  },
};
