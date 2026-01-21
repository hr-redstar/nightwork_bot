const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');

class MessageCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: false });
    this.data = new SlashCommandBuilder()
      .setName('メッセージ')
      .setDescription('メッセージを表示します（未実装）');
  }

  async run(interaction) {
    await interaction.reply({
      content: 'メッセージコマンド（未実装）',
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = new MessageCommand();
