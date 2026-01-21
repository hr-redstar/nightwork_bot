// src/commands/20_設定chat_gpt.js
// ----------------------------------------------------
// /設定chat_gpt
//   - ChatGPT設定パネルを設置するコマンド
// ----------------------------------------------------

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const { sendChatGptSettingPanel } = require('../modules/chat_gpt/setting/sendChatGptSettingPanel');

module.exports = {
  // スラッシュコマンド定義
  data: new SlashCommandBuilder()
    .setName('設定chat_gpt')
    .setDescription('ChatGPT設定パネルを表示します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * コマンド実行ハンドラー
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      await sendChatGptSettingPanel(interaction);
    } catch (err) {
      logger.error('[20_設定chat_gpt] コマンド実行エラー:', err);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: '⚠️ chat_gpt設定のパネル表示中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
      } else {
        await interaction.reply({
          content: '⚠️ chat_gpt設定のパネル表示中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        }).catch(() => { });
      }
    }
  },
};
