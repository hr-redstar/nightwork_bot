// src/commands/13_設定KPI.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postKpiPanel } = require('../handlers/KPI/kpiPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定kpi')
    .setDescription('KPI設定パネルを設置します（管理者用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // 先に応答を保留
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postKpiPanel(interaction.channel);
      await interaction.deleteReply();
    } catch (err) {
      console.error('❌ /設定KPI 実行エラー:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '⚠️ KPI設定パネルの設置中にエラーが発生しました。' }).catch(() => {});
      }
    }
  },
};