const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { postSekkyakuSettingPanel } = require('../modules/sekkyaku/ui/panel');

class SekkyakuLogSettingCommand extends BaseCommand {
  constructor() {
    super({ flags: MessageFlags.Ephemeral, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定接客ログ')
      .setDescription('接客ログ設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  }

  async run(interaction) {
    await postSekkyakuSettingPanel(interaction);
  }
}

module.exports = new SekkyakuLogSettingCommand();
