/**
 * ギルドコマンド登録スクリプト
 * -----------------------------------------
 * 開発用に、.env ファイルで指定されたギルドにコマンドを登録します。
 * グローバルコマンドと違い、即時反映されます。
 */

require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');
const { loadCommands } = require('./commandLoader');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  logger.error('❌ ギルドコマンド登録に必要な環境変数 (DISCORD_TOKEN, CLIENT_ID, GUILD_ID) が不足しています。');
  process.exit(1);
}

const commands = loadCommands(__dirname, logger, '[DeployGuild]');

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// 重複を除外するために Set を利用する
const guildIds = [...new Set(GUILD_ID.split(',').map(id => id.trim()))];

async function deployCommands() {
  if (commands.length === 0) {
    logger.warn('📜 登録するギルドコマンドが見つかりませんでした。');
    return;
  }

  logger.info(`📜 ${commands.length}個のギルドコマンドを登録します...`);

  for (const guildId of guildIds) {
    try {
      const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commands });
      logger.info(`✅ ギルド [${guildId}] に ${data.length}個のコマンドを登録しました。`);
    } catch (error) {
      logger.error(`❌ ギルド [${guildId}] へのコマンド登録に失敗しました:`, error);
    }
  }
}

deployCommands().catch(error => {
  logger.error('❌ deployCommands の実行中に予期せぬエラーが発生しました:', error);
  // デプロイスクリプトで致命的なエラーが発生した場合はプロセスを終了
  process.exit(1); 
});