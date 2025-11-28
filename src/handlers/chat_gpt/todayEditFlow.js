// src/handlers/chat_gpt/todayEditFlow.js

/**
 * 「今日のchat gpt設定編集」ボタンハンドラー
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleTodaySettingEditButton(interaction) {
  await interaction.reply({
    content: 'この機能は現在開発中です。',
    ephemeral: true,
  });
}

module.exports = { handleTodaySettingEditButton };