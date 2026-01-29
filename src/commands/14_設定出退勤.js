const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { postSyutSettingPanel } = require('../modules/syut/ui/panel');

class SyuttaikinSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: false, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定出退勤')
      .setDescription('出退勤・シフト管理の設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  }

  async run(interaction) {
    await postSyutSettingPanel(interaction);
  }
}

module.exports = new SyuttaikinSettingCommand();
