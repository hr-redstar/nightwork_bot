// src/commands/設定売上.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { postUriagePanel } = require('../handlers/uriage/uriagePanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定売上')
    .setDescription('売上設定パネルを表示します（管理者向け）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      // 処理に時間がかかる可能性があるため、先に応答を保留する
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      // postUriagePanel はチャンネルオブジェクトを引数に取る
      await postUriagePanel(interaction.channel);
      // 処理完了後、保留した応答を編集して成功を伝える
      await interaction.editReply({ content: '✅ 売上設定パネルを設置しました。' });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '⚠️ 売上設定パネルの表示に失敗しました。' });
    }
  },
};
