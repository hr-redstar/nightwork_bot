const { handleSettingInteraction } = require('./setting');
const { handleRequestInteraction } = require('./request');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * keihi_* 系インタラクションのエントリーポイント
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiInteraction(interaction) {
  try {
    const customId = interaction.customId || '';

    if (customId.startsWith('keihi_config') || customId.startsWith('keihi_setting')) {
      return await handleSettingInteraction(interaction);
    }

    if (customId.startsWith('keihi_request')) {
      return await handleRequestInteraction(interaction);
    }
  } catch (err) {
    await handleInteractionError(interaction, err);
  }
}

module.exports = {
  handleKeihiInteraction,
};
