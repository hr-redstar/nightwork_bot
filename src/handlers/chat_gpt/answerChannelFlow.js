// src/handlers/chat_gpt/answerChannelFlow.js

/**
 * 「chatgpt回答チャンネル設定」ボタンハンドラー
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleAnswerChannelButton(interaction) {
  await interaction.reply({
    content: 'この機能は現在開発中です。',
    ephemeral: true,
  });
}

module.exports = { handleAnswerChannelButton };