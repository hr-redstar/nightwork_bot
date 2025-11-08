// src/commands/設定出退勤.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { postSyutPanel } = require('../handlers/syut/syutPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定出退勤')
    .setDescription('出退勤設定パネルを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await postSyutPanel(interaction.channel);
    await interaction.reply({ content: '✅ 出退勤設定パネルを設置しました。', flags: MessageFlags.Ephemeral });
  },
};
