﻿// src/index.js

require('events').EventEmitter.defaultMaxListeners = 20;
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const client = require('./botClient');
const logger = require('./utils/logger');
const express = require('express');
const httpLogger = require('./utils/httpLogger');
const postCastRouter = require('./utils/syut/postCast');
const { DEV_GUILD_IDS } = require('./utils/config/envConfig');
const { deployCommands } = require('../scripts/deployGuildCommands'); // この行が正しいことを確認
const { initSyutCron } = require('./utils/syut/syutCron');
console.log("Loading env variables")
const { 
  DISCORD_TOKEN,
  GCS_BUCKET_NAME,
  NODE_ENV,
  GUILD_ID,
  GCS_ENABLED,
} = process.env;

// --- Express サーバー設定 ---
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(httpLogger);
app.use('/', postCastRouter); // ルーターを登録

app.get('/', (req, res) => {
  res.status(200).send('Bot is running.');
});

// -------------------------

// イベントロード
function loadEvents(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const event = require(path.join(dir, file));
      if (event?.name && event.execute) {
        if (event.once) client.once(event.name, (...args) => event.execute(...args));
        else client.on(event.name, (...args) => event.execute(...args, client));
        logger.info(`📡 イベント登録: ${event.name}`);
    }
  }
  }
}

// コマンドロード
function loadCommands(dir) {
  const commandFiles = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const command = require(path.join(dir, file));
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`✅ コマンド登録: /${command.data.name}`);
      } else {
        logger.warn(`⚠️ [${file}] は data または execute プロパティが不足しています。`);
      }
    } catch (error) {
      logger.error(`❌ コマンド読み込み失敗: ${file}`, error);
    }
  }
}

// 初期化
(async () => {
  if (!DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN が未設定です。.env を確認してください。');
    process.exit(1);
  }

  if (DEV_GUILD_IDS.length > 0) {
    console.log('🧪 開発ホワイトリスト有効:', DEV_GUILD_IDS.join(', '));
    console.log('🧪 DEV_GUILD_IDS (raw):', process.env.DEV_GUILD_IDS);
  }

  loadCommands(path.join(__dirname, 'commands'));
  loadEvents(path.join(__dirname, 'events'));

  // --- コマンドデプロイ（開発用） ---
  if (NODE_ENV !== 'production' && GUILD_ID) {
    try {
      await deployCommands()
    } catch (e) {
      logger.warn('スラッシュコマンドのデプロイに失敗しました:', e);
    }
  }

  // --- クライアント準備 ---
  // NOTE: ログイン完了ログは `src/events/ready.js` 側で出力するため、ここでは重複しないようにしている。

  // --- シャットダウン処理 ---
  const shutdown = async (signal) => {
    try {
      logger.info(`受信シグナル: ${signal}. クライアントを終了します...`);
      await client.destroy();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // --- Discordログイン ---
  try {
    await client.login(DISCORD_TOKEN);
  } catch (e) {
    logger.error('Discord ログインに失敗しました:', e);
    process.exit(1);
  }

  // --- Express サーバー起動 ---
  app.listen(PORT, () => {
    logger.info(`🚀 Expressサーバーがポート ${PORT} で起動しました`);
  });
})();
