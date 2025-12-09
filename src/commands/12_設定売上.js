const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { postUriageSettingPanel } = require('../handlers/uriage/setting/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定売上')
    .setDescription('売上機能に関する設定パネルを表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      // コマンド実行者のみに見えるようエフェメラルで応答
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postUriageSettingPanel(interaction);
    } catch (err) {
      logger.error('[/設定売上] エラー:', err);
      const content = '⚠️ 売上設定パネルの表示中にエラーが発生しました。';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content });
      }
    }
  },
};
