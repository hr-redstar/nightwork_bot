﻿const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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

    // 完了メッセージ（承認済みの場合のみ削除を試行）
    // interaction.deleteReply() は webhook 経由なので、
    // DiscordAPIError[40060]等でローカルの deferred が false のままだと
    // Discord.js が InteractionNotReplied を投げるのを回避する。
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.deleteReply();
      }
    } catch (err) {
      logger.debug('[ConfigCommand] deleteReply ignored:', err.message);
    }
  }
}

module.exports = new ConfigCommand();
