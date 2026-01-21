﻿const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendMainSettingPanel } = require('../modules/config/setting/sendMainSettingPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定')
    .setDescription('設定パネルを設置・更新します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await sendMainSettingPanel(interaction.channel);
      await interaction.deleteReply();
    } catch (err) {
      console.error('❌ /設定 コマンド実行エラー:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '❌ 設定パネル設置中にエラーが発生しました。' }).catch(() => { });
      }
    }
  },
};
