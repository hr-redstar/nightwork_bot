// src/handlers/chat_gpt/usageFlow.js

/**
 * 「chat gpt使用率」ボタンハンドラー
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleUsageButton(interaction) {
  await interaction.reply({
    content: 'この機能は現在開発中です。',
    ephemeral: true,
  });
}

module.exports = { handleUsageButton };