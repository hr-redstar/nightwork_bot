// src/handlers/commandHandler.js

const { MessageFlags } = require('discord.js');
const { isGuildSubscribed } = require('../utils/subscriptionManager');
const { DEV_GUILD_IDS } = require('../utils/config/envConfig');

const logger = require('../utils/logger');

async function handleCommand(interaction, command) {
  const guildId = interaction.guildId;

  const logPrefix = DEV_GUILD_IDS.includes(guildId)
    ? '[DEV]'
    : '[PROD]';
  if (!isGuildSubscribed(guildId)) {
    await interaction.reply({
      content: '🚫 このサーバーでは契約が有効ではありません。\nサブスクリプション契約を更新してください。',
      flags: MessageFlags.Ephemeral,
    });
    logger.warn(`非契約ギルドからのコマンド: ${guildId}`);
    return;
  }

  logger.info(`${logPrefix} コマンド実行: ${command.data.name}`);
  await command.execute(interaction);
}

module.exports = { handleCommand };
