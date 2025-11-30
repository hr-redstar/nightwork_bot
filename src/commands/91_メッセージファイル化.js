// src/commands/91_メッセージファイル化.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { exportTextChannelMessages } = require('../handlers/message/exportTextChannelMessages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('メッセージファイル化')
    .setDescription('テキストチャンネルのこれまでのメッセージを全てファイル化します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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