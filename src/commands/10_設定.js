﻿// src/commands/10_設定.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendConfigPanel } = require('../modules/config/execute/configPanel');

class ConfigCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定')
      .setDescription('設定パネルを設置・更新します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    // メイン設定パネルを送信
    await sendConfigPanel(interaction.channel);

    // 完了メッセージ（すぐに削除）
    await interaction.deleteReply();
  }
}

module.exports = new ConfigCommand();
