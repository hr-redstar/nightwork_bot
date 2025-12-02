// src/handlers/chat_gpt/usageFlow.js

/**
 * 「chat gpt使用率」ボタンハンドラー
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleUsageButton(interaction) {
  await interaction.reply({
    content: 'この機能は現在開発中です。',
    flags: require('discord.js').MessageFlags.Ephemeral,
  });
}

module.exports = { handleUsageButton };