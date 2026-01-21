const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendSyutSettingPanel } = require('../modules/syut/setting/sendSyutSettingPanel');

class SyutSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定出退勤')
      .setDescription('出退勤の設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    await sendSyutSettingPanel(interaction);
  }
}

module.exports = new SyutSettingCommand();
