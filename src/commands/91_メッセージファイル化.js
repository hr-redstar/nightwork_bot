const { SlashCommandBuilder, ChannelType } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { exportTextChannelMessages } = require('../modules/message/execute/exportTextChannelMessages');

class ExportMessagesCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('メッセージファイル化')
      .setDescription('テキストチャンネルのこれまでのメッセージを全てファイル化します')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('対象チャンネル（未指定なら実行チャンネル）')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      );
  }

  async run(interaction) {
    await exportTextChannelMessages(interaction);
  }
}

module.exports = new ExportMessagesCommand();