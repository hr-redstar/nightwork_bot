const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendTennaiSettingPanel } = require('../modules/tennai_hikkake/setting/sendTennaiSettingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定店内状況_ひっかけ一覧')
    .setDescription('店内状況・ひっかけの設定パネルを表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await sendTennaiSettingPanel(interaction);
  },
};