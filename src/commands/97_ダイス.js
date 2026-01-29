const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class DiceCommand extends BaseCommand {
  constructor() {
    super({ flags: MessageFlags.Ephemeral, defer: false });
    this.data = new SlashCommandBuilder()
      .setName('ダイス')
      .setDescription('1から100のサイコロを振ります');
  }

  async run(interaction) {
    const result = Math.floor(Math.random() * 100) + 1;
    await interaction.reply({
      content: `🎲 ダイスの結果: **${result}**`,
    });
  }
}

module.exports = new DiceCommand();
