// src/index.js

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
const { deployCommands } = require('../scripts/deployGuildCommands'); // コマンド再読み込み確認
const { initSyutCron } = require('./utils/syut/syutCron');
const { migrateKeihiConfig } = require('./utils/keihi/keihiMigrator');
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
app.use('/', postCastRouter); // 出退勤POST ルーター

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
        logger.info(`📡 イベント読込: ${event.name}`);
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
        logger.info(`📝 コマンド読込: /${command.data.name}`);
      } else {
        logger.warn(`⚠️ [${file}] に data または execute が定義されていません。`);
      }
    } catch (error) {
      logger.error(`❌ コマンド読込失敗: ${file}`, error);
    }
  }
}

// -------------------------
// メイン処理
// -------------------------
(async () => {
  if (!DISCORD_TOKEN) {
    logger.error('❌ DISCORD_TOKEN が設定されていません。.env を確認してください。');
    process.exit(1);
  }

  if (DEV_GUILD_IDS.length > 0) {
    console.log('🧪 開発用ギルドID一覧:', DEV_GUILD_IDS.join(', '));
    console.log('🧪 DEV_GUILD_IDS (raw):', process.env.DEV_GUILD_IDS);
  }

  loadCommands(path.join(__dirname, 'commands'));
  loadEvents(path.join(__dirname, 'events'));

  client.once('clientReady', async () => {
    // for (const [guildId, guild] of client.guilds.cache) {
    //   try {
    //     const result = await migrateKeihiConfig(guildId, { dryRun: false });

    //     if (result.migrated) {
    //       logger.info(
    //         `[keihiMigrator] ギルド ${guild.name} (${guildId}) の keihi/config.json を新フォーマットへ変換しました。`,
    //       );
    //     } else {
    //       logger.info(
    //         `[keihiMigrator] ギルド ${guild.name} (${guildId}) はマイグレーション不要でした。`,
    //       );
    //     }
    //   } catch (err) {
    //     logger.error(
    //       `[keihiMigrator] ギルド ${guildId} のマイグレーション中にエラー`,
    //       err,
    //     );
    //   }
    // }
  });

  // --- コマンドデプロイ（開発用） ---
  if (NODE_ENV !== 'production' && GUILD_ID) {
    try {
      await deployCommands();
    } catch (e) {
      logger.warn('⚠️ スラッシュコマンドのデプロイに失敗しました:', e);
    }
  }

  // --- シャットダウン ---
  const shutdown = async (signal) => {
    try {
      logger.info(`🔻 終了シグナル受信: ${signal}. クライアントを終了します...`);
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
  app.listen(PORT, () => {
    logger.info(`🌐 Express サーバー起動: ポート ${PORT}`);
  });
})();
