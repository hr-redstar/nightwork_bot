// src/handlers/commandHandler.js

const { MessageFlags } = require('discord.js');
const { isGuildSubscribed } = require('../utils/subscriptionManager');
const { DEV_GUILD_IDS } = require('../utils/config/envConfig');
const { getGuildConfig } = require('../utils/config/gcsConfigManager');

const logger = require('../utils/logger');

async function handleCommand(interaction, command) {
  const guildId = interaction.guildId;
  const commandName = command.data.name;

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

  // --- /設定 コマンド以外は役職チェック ---
  if (commandName !== '設定') {
    const guild = interaction.guild;
    const member = interaction.member;
    
    // 管理者権限チェック
    if (member.permissions.has('Administrator')) {
      // 管理者は制限なし
      logger.info(`${logPrefix} コマンド実行: ${commandName} (管理者権限)`);
      await command.execute(interaction);
      return;
    }

    // 一般ユーザーは役職チェック
    const guildConfig = await getGuildConfig(guildId);
    const commandExecutorRoleId = guildConfig?.commandExecutorRoleId;

    if (!commandExecutorRoleId) {
      await interaction.reply({
        content: '⚠️ このコマンドを実行する権限がありません。\n管理者が `/設定` からコマンド実行役職を設定してください。',
        flags: MessageFlags.Ephemeral,
      });
      logger.warn(`権限なしコマンド実行: ${commandName} by ${interaction.user.tag}`);
      return;
    }

    // ユーザーが指定の役職を持っているか確認
    const hasRole = member.roles.cache.has(commandExecutorRoleId);
    if (!hasRole) {
      const role = await guild.roles.fetch(commandExecutorRoleId).catch(() => null);
      const roleName = role?.name || commandExecutorRoleId;
      await interaction.reply({
        content: `⚠️ このコマンドを実行する権限がありません。\n必要な役職: <@&${commandExecutorRoleId}>`,
        flags: MessageFlags.Ephemeral,
      });
      logger.warn(`権限なしコマンド実行: ${commandName} by ${interaction.user.tag} (必要役職: ${roleName})`);
      return;
    }
  }

  logger.info(`${logPrefix} コマンド実行: ${commandName}`);
  await command.execute(interaction);
}

module.exports = { handleCommand };
