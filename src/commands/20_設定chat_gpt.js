// src/commands/20_設定chat_gpt.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendChatGptSettingPanel } = require('../modules/chat_gpt/setting/sendChatGptSettingPanel');

class ChatGptSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定chat_gpt')
      .setDescription('ChatGPT設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    await sendChatGptSettingPanel(interaction);
  }
}

module.exports = new ChatGptSettingCommand();
