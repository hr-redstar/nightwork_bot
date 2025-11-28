// src/commands/20_設定chat_gpt.js
// ----------------------------------------------------
// /設定chat_gpt
//   - ChatGPT設定パネルを設置するコマンド
//   - 実処理は handlers/chat_gpt/index.js に委譲
// ----------------------------------------------------

const { SlashCommandBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { handleSettingChatGpt } = require('../handlers/chat_gpt'); // ← handlers/chat_gpt/index.js を想定

module.exports = {
  // スラッシュコマンド定義
  data: new SlashCommandBuilder()
    .setName('設定chat_gpt')
    .setDescription('ChatGPT設定パネルを表示・設定します'),

  /**
   * コマンド実行ハンドラー
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      // 統一スタイル：実処理はハンドラーへ委譲
      await handleSettingChatGpt(interaction);
    } catch (err) {
      logger.error('[20_設定chat_gpt] コマンド実行エラー:', err);

      // 返信済みかどうかで分岐（他コマンドと同じ書き方に合わせて調整可）
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: '⚠️ chat_gpt設定の処理中にエラーが発生しました。',
          ephemeral: true,
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '⚠️ chat_gpt設定の処理中にエラーが発生しました。',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
