// src/commands/commandHandler.js

const { MessageFlags } = require('discord.js');
const { getSubscription, isActive } = require('../utils/gcsSubscription');
const logger = require('../utils/logger');

async function handleCommand(interaction) {
  const guildId = interaction.guildId;
  const sub = await getSubscription(guildId);

  if (!isActive(sub)) {
    await interaction.reply({
      content: '🚫 このサーバーでは契約が有効ではありません。\nサブスクリプション契約を更新してください。',
      flags: MessageFlags.Ephemeral,
    });
    logger.warn(`非契約ギルドからのコマンド: ${guildId}`);
    return;
  }

  // 契約OKなら通常処理へ
  if (interaction.commandName === 'ping') {
    await interaction.reply('契約ギルドとして確認済みです。');
  }
}

module.exports = { handleCommand };
