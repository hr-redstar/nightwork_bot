// src/commands/91_メッセージファイル化.js
const {
  SlashCommandBuilder,
  ChannelType,
} = require('discord.js');
const { exportTextChannelMessages } = require('../modules/message/execute/exportTextChannelMessages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('メッセージファイル化')
    .setDescription('テキストチャンネルのこれまでのメッセージを全てファイル化します')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('対象チャンネル（未指定なら実行チャンネル）')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    await exportTextChannelMessages(interaction);
  },
};