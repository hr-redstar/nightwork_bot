const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const { sendUriageSettingPanel } = require('../handlers/uriage/setting/panel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('設定売上')
    .setDescription('売上機能に関する設定パネルを表示します。')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // ephemeral: true をデフォルトに
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    try {
      await sendUriageSettingPanel(interaction);
    } catch (err) {
      logger.error('[/設定売上] エラー:', err);
      await interaction.followUp({
        content: '⚠️ 売上設定パネルの表示中にエラーが発生しました。',
        flags: [MessageFlags.Ephemeral],
      });
    }
  },
};
