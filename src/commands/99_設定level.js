const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const appRouter = require('../structures/AppRouter');

class LevelSettingCommand extends BaseCommand {
  constructor() {
    super({ flags: MessageFlags.Ephemeral, defer: false });
    this.data = new SlashCommandBuilder()
      .setName('設定level')
      .setDescription('レベル設定パネルを表示します');
  }

  async run(interaction) {
    // AppRouter経由でレベル設定パネルを表示
    interaction.customId = 'level:panel:refresh';
    return await appRouter.dispatch(interaction);
  }
}

module.exports = new LevelSettingCommand();
