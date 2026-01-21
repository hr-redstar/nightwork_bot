const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class LevelSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: false });
    this.data = new SlashCommandBuilder()
      .setName('設定level')
      .setDescription('レベル設定パネルを表示します');
  }

  async run(interaction) {
    await interaction.reply({
      content: 'レベル設定パネル（未実装）',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = new LevelSettingCommand();
