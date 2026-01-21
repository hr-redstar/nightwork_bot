const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendSyutSettingPanel } = require('../modules/syut/setting/sendSyutSettingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定出退勤')
    .setDescription('出退勤の設定パネルを表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await sendSyutSettingPanel(interaction);
  },
};
