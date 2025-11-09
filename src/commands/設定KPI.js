/**
 * src/commands/設定KPI.js
 * 管理者用 /設定KPI コマンド
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postOrUpdateKpiConfigPanel } = require('../handlers/KPI/KPIPanel_Setup.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定kpi')
    .setDescription('KPI設定パネルを設置します（管理者専用）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postOrUpdateKpiConfigPanel(interaction.channel);
      await interaction.editReply({ content: '✅ KPI設定パネルを設置しました。' });
    } catch (err) {
      console.error('❌ /設定KPI 実行エラー:', err);
      await interaction.editReply({
        content: '⚠️ パネル設置中にエラーが発生しました。',
      });
    }
  },
};
