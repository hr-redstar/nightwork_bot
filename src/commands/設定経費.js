/**
 * src/commands/設定経費.js
 * /設定経費 コマンド
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendConfigPanel } = require('../handlers/keihi/keihiPanel_Config.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定経費')
    .setDescription('経費設定パネルを表示します（管理者向け）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // 処理のタイムアウトを防ぐため、応答を保留
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      // 経費設定パネルを投稿・更新する関数を呼び出し
      await sendConfigPanel(interaction.channel, interaction.guild.id);
      await interaction.editReply({ content: '✅ 経費設定パネルを設置しました。' });
    } catch (err) {
      console.error('❌ /設定経費 コマンド実行エラー:', err);
      await interaction.editReply({ content: '⚠️ 経費設定パネルの設置に失敗しました。' });
    }
  },
};