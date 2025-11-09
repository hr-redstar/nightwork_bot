// src/commands/設定出退勤.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postSyutPanel } = require('../handlers/syut/syutPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定出退勤')
    .setDescription('出退勤設定パネルを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postSyutPanel(interaction.channel);
      await interaction.editReply({ content: '✅ 出退勤設定パネルを設置しました。' });
    } catch (err) {
      console.error('❌ /設定出退勤 実行エラー:', err);
      await interaction.editReply({ content: '⚠️ 出退勤設定パネルの設置に失敗しました。' });
    }
  },
};
