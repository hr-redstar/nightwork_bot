// src/index.js

require('events').EventEmitter.defaultMaxListeners = 20;
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const client = require('./botClient');
const logger = require('./utils/logger');
const tennaiHikkakeBotHandler = require('./handlers/tennai_hikkakeBotHandler');
const { deployCommands } = require('../scripts/deployGuildCommands');

const {
  DISCORD_TOKEN,
  GCS_BUCKET_NAME,
  NODE_ENV,
  GUILD_ID,
  GCS_ENABLED,
} = process.env;

async function initGCS() {
  if (GCS_ENABLED !== 'false' && GCS_BUCKET_NAME) {
    logger.info('☁️ GCS 設定を読み込みました');
  } else {
    logger.warn('☁️ GCS 機能は無効化されています。');
  }
}

// イベントロード
function loadEvents(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      const event = require(path.join(dir, file));
      if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
      else client.on(event.name, (...args) => event.execute(...args, client));
      logger.info(`📡 イベント登録: ${event.name}`);
    }
  }
}

// 初期化
(async () => {
  await initGCS();

  if (!DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN が未設定です。.env を確認してください。');
    process.exit(1);
  }

  // --- BOT 機能登録 ---
  tennaiHikkakeBotHandler(client);
  loadEvents(path.join(__dirname, 'events'));

  // --- コマンドデプロイ（開発用） ---
  if (NODE_ENV !== 'production' && GUILD_ID) {
    try {
      await deployCommands();
    } catch (e) {
      logger.warn('スラッシュコマンドのデプロイに失敗しました:', e);
    }
  }

  logger.info(
    `環境: ${NODE_ENV || 'development'} | GCS: ${GCS_BUCKET_NAME ? 'enabled' : 'disabled'} | Guild: ${GUILD_ID || 'N/A'}`
  );

  // --- クライアント準備 ---
  client.once('clientReady', () => {
    logger.info(`✅ ログイン完了: ${client.user.tag}`);
  });

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
})();

// グローバルエラーハンドリング
process.on('unhandledRejection', (reason) => logger.error('⚠️ Promise未処理拒否:', reason));
process.on('uncaughtException', (error) => logger.error('💥 未処理の例外:', error));
