const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class SekkyakuLogSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: false }); // Not deferring here as it's a simple reply
    this.data = new SlashCommandBuilder()
      .setName('設定接客ログ')
      .setDescription('接客ログ設定パネルを表示します');
  }

  async run(interaction) {
    await interaction.reply({
      content: '接客ログ設定パネル（未実装）',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = new SekkyakuLogSettingCommand();
