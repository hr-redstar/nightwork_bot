// src/commands/設定売上.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { sendCommandLog } = require('../utils/uriage/embedLogger');
const { postUriageSettingPanel } = require('../handlers/uriage/setting/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定売上')
    .setDescription('売上設定パネルを送信/更新します。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      // コマンドログ出力
      await sendCommandLog(interaction);

      // 設定パネル送信 or 更新
      await postUriageSettingPanel(interaction);
    } catch (err) {
      console.error('[/設定売上] エラー:', err);

      if (interaction.deferred) {
        await interaction.editReply({
          content: '⚠️ 売上設定パネルの表示中にエラーが発生しました。',
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: '⚠️ 売上設定パネルの表示中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
