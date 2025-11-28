const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('メッセージ')
    .setDescription('接客ログ設定パネルを表示します'),

  async execute(interaction) {
    try {
      await interaction.reply({
        content: '接客ログ設定パネル（未実装）',
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('[/メッセージ] エラー:', err);
    }
  }
};
