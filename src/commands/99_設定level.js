const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定level')
    .setDescription('レベル設定パネルを表示します'),

  async execute(interaction) {
    await interaction.reply({
      content: '接客ログ設定パネル（未実装）',
      flags: MessageFlags.Ephemeral,
    });
  }
};
