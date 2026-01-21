const { SlashCommandBuilder } = require('discord.js');
const BaseCommand = require('../structures/BaseCommand');
const { sendKpiSettingPanel } = require('../modules/kpi/setting/sendKpiSettingPanel');

class KpiSettingCommand extends BaseCommand {
  constructor() {
    super({ ephemeral: true, defer: true });
    this.data = new SlashCommandBuilder()
      .setName('設定kpi')
      .setDescription('KPIの設定パネルを表示します');
  }

  async run(interaction) {
    await sendKpiSettingPanel(interaction);
  }
}

module.exports = new KpiSettingCommand();