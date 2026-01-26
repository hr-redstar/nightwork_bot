// src/commands/97_ダイス.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class DiceCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: false });
    this.data = new SlashCommandBuilder()
      .setName('設定ダイス')
      .setDescription('ダイス設定パネルを表示します（未実装）');
  }

  async run(interaction) {
    await interaction.reply({
      content: 'ダイス設定パネル（未実装）',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = new DiceCommand();
