// src/index.js

require('events').EventEmitter.defaultMaxListeners = 20;
require('dotenv').config();

const path = require('path');
const fs = require('fs');

const client = require('./botClient');
const logger = require('./utils/logger');
const { DEV_GUILD_IDS } = require('./utils/config/envConfig');
const { deployCommands } = require('../scripts/deployGuildCommands');

require('./utils/gcs'); // requireするだけでgcs.jsが初期化され、ログが出力されます

const {
  DISCORD_TOKEN,
  GCS_BUCKET_NAME,
  NODE_ENV,
  GUILD_ID,
} = process.env;

// ----------------------------------------------------
// イベントロード
// ----------------------------------------------------
function loadEvents(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    const event = require(path.join(dir, file));
    if (event?.name && event.execute) {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.info(`📡 イベント読込: ${event.name}`);
    }
  }
}

// ----------------------------------------------------
// コマンドロード
// ----------------------------------------------------
function loadCommands(dir) {
  const commandFiles = fs.readdirSync(dir).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const command = require(path.join(dir, file));

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`📝 コマンド読込: /${command.data.name}`);
      } else {
        logger.warn(`⚠️ [${file}] に data または execute が定義されていません。`);
      }
    } catch (error) {
      logger.error(`❌ コマンド読込失敗: ${file}`, error);
    }
  }
}

// ----------------------------------------------------
// メイン処理
// ----------------------------------------------------
(async () => {
  // --- 必須環境変数チェック ---
  if (!DISCORD_TOKEN) {
    logger.error('❌ DISCORD_TOKEN が設定されていません。.env を確認してください。');
    process.exit(1);
  }

  // --- 開発用ギルド ID ログ ---
  if (DEV_GUILD_IDS.length > 0) {
    logger.info(`🧪 開発用ギルドID一覧: ${DEV_GUILD_IDS.join(', ')}`);
    logger.info(`🧪 DEV_GUILD_IDS (raw): ${process.env.DEV_GUILD_IDS}`);
  }

  // --- コマンド / イベント読込 ---
  loadCommands(path.join(__dirname, 'commands'));
  loadEvents(path.join(__dirname, 'events'));

  // --- スラッシュコマンド デプロイ（開発モードのみ） ---
  if (NODE_ENV !== 'production' && GUILD_ID) {
    try {
      await deployCommands();
    } catch (e) {
      logger.warn('⚠️ スラッシュコマンドのデプロイに失敗しました:', e);
    }
  }

  // --- シャットダウン処理 ---
  const shutdown = async (signal) => {
    try {
      logger.info(`🔻 終了シグナル受信: ${signal} / クライアントを終了します...`);
      await client.destroy();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // --- Discord ログイン ---
  try {
    await client.login(DISCORD_TOKEN);
  } catch (e) {
    logger.error('❌ Discord ログインに失敗しました:', e);
    process.exit(1);
  }

  // --- Express 起動 ---
  // app.listen(PORT, () => {
  //   logger.info(`🌐 Express サーバー起動: ポート ${PORT}`);
  // });
  // --- Cron開始 ---
})();
