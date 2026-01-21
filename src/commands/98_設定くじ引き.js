const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendKuzibikiSettingPanel } = require('../modules/kuzibiki/setting/sendKuzibikiSettingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定くじ引き')
    .setDescription('くじ引きの設定パネルを表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await sendKuzibikiSettingPanel(interaction);
  },
};
