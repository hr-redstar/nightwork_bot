// src/commands/98_設定くじ引き.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendKuzibikiSettingPanel } = require('../modules/kuzibiki/setting/sendKuzibikiSettingPanel');

class KuzibikiSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定くじ引き')
      .setDescription('くじ引きの設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    await sendKuzibikiSettingPanel(interaction);
  }
}

module.exports = new KuzibikiSettingCommand();
