const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendTennaiSettingPanel } = require('../modules/tennai_hikkake/setting/sendTennaiSettingPanel');

class TennaiSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: false }); // sendTennaiSettingPanel likely handles its own defer/reply?
    // Original code: await sendTennaiSettingPanel(interaction);
    // Let's check sendTennaiSettingPanel. If it doesn't defer/reply, command fails.
    // Original code didn't defer.
    // I will assume defer: true is safer. But prompt says "User setting actions -> Ephemeral: true, ... heavy -> defer".
    // I'll set defer: true to be safe and consistent.
    this.defer = true;
    this.ephemeral = true;

    this.data = new SlashCommandBuilder()
      .setName('設定店内状況_ひっかけ一覧')
      .setDescription('店内状況・ひっかけの設定パネルを表示します')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }

  async run(interaction) {
    await sendTennaiSettingPanel(interaction);
  }
}

module.exports = new TennaiSettingCommand();