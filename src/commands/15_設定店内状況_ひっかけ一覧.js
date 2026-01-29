// src/commands/15_設定店内状況_ひっかけ一覧.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const setupHandler = require('../modules/tennai_hikkake/handlers/SetupHandler');

class TennaiSettingCommand extends BaseCommand {
  constructor() {
    super({ flags: MessageFlags.Ephemeral, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定店内状況_ひっかけ一覧')
      .setDescription('店内状況・ひっかけの設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    // 最新の Platinum SetupHandler を直接呼び出し
    await setupHandler.startSetup(interaction);
  }
}

module.exports = new TennaiSettingCommand();