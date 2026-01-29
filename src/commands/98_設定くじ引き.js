const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { upsertKuzibikiPanel } = require('../modules/kuzibiki/execute/lotteryPanel');

class KuzibikiSettingCommand extends BaseCommand {
  constructor() {
    super({ flags: MessageFlags.Ephemeral, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定くじ引き')
      .setDescription('くじ引きパネルを送信/更新します。');
  }

  async run(interaction) {
    const msg = await upsertKuzibikiPanel(interaction.channel);
    await interaction.editReply({
      content: `✅ くじ引きパネルを設置・更新しました (${msg.url})`,
    });
  }
}

module.exports = new KuzibikiSettingCommand();
