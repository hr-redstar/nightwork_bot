// src/modules/common/handlers/replyError.js

const { MessageFlags } = require('discord.js');
const buildBaseEmbed = require('../utils/embed/buildBaseEmbed');

module.exports = async function replyError(
  interaction,
  error,
  {
    functionKey = 'common',
    guildConfig,
    userMessage = '処理中にエラーが発生しました。',
  } = {}
) {
  const embed = buildBaseEmbed({
    interaction,
    functionKey,
    guildConfig,
    title: '⚠️ エラー',
    description: userMessage,
    fields: error
      ? [{ name: '詳細', value: `\`\`\`${String(error.message ?? error)}\`\`\`` }]
      : [],
  });

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  return interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
};
