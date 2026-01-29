/**
 * src/utils/logger.js
 * ログ出力ユーティリティ (Context-Aware)
 * ---------------------------------------
 * - winstonベースの統一ロガー
 * - AsyncLocalStorageによるリクエストコンテキスト追跡
 * - エラー時にstack traceも出力
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const settings = require('../config/settings');
const { AsyncLocalStorage } = require('async_hooks');

// -------------------------------------------------------------
// 🎨 カラー設定 (デバッグレベルの青は見にくいため緑に変更)
// -------------------------------------------------------------
winston.addColors({
  debug: 'green',
  info: 'cyan', // infoを少し変えて区別しやすくする（任意だが今回は green 優先）
});

// コンテキスト保持用
const contextStorage = new AsyncLocalStorage();

// -------------------------------------------------------------
// 📁 ログ出力ディレクトリ設定
// -------------------------------------------------------------
const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 🧩 フォーマッター
// -------------------------------------------------------------
const isProd = settings.nodeEnv === 'production';

// コンテキスト注入フォーマット
const contextFormat = winston.format((info) => {
  const store = contextStorage.getStore();
  if (store) {
    // 既存のメタデータがあれば維持しつつマージ
    info.requestId = store.requestId || info.requestId;
    info.guildId = store.guildId || info.guildId;
    info.userId = store.userId || info.userId;
    info.context = store.context || info.context;
  }
  return info;
});

const baseFormat = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  contextFormat(), // コンテキスト注入
];

// ログメッセージの組み立て (Dev)
const devFormat = winston.format.combine(
  ...baseFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, requestId, guildId }) => {
    let prefix = `[${level} ${timestamp}]`;
    if (requestId) prefix += ` [Req:${requestId}]`;
    if (guildId) prefix += ` [G:${guildId}]`;

    const base = `${prefix} ${message}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

// ログメッセージの組み立て (Prod - JSON推奨だが、一旦プレーンテキストで視認性重視)
const prodFormat = winston.format.combine(
  ...baseFormat,
  winston.format.printf(({ level, message, timestamp, stack, requestId, guildId, userId }) => {
    let prefix = `[${level.toUpperCase()} ${timestamp}]`;
    if (requestId) prefix += ` [Req:${requestId}]`;
    if (guildId) prefix += ` [G:${guildId}]`;
    if (userId) prefix += ` [U:${userId}]`;

    const base = `${prefix} ${message}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

const logger = winston.createLogger({
  level: settings.logLevel,
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
    }),
  ],
});

// -------------------------------------------------------------
// 🧩 コンテキスト・ヘルパー
// -------------------------------------------------------------
// 特定の処理をコンテキスト付きで実行する
logger.runWithContext = (context, fn) => {
  return contextStorage.run(context, fn);
};

// コンテキストを作成するヘルパー
logger.createContext = (interaction, traceId = null) => {
  return {
    requestId: traceId || Math.random().toString(36).substring(7), // 簡易ID
    guildId: interaction?.guildId,
    userId: interaction?.user?.id,
    context: interaction?.customId || interaction?.commandName || 'unknown'
  };
};

logger.getContext = () => {
  return contextStorage.getStore() || {};
};

Object.defineProperty(logger, 'traceId', {
  get: () => contextStorage.getStore()?.requestId || 'N/A'
});

// -------------------------------------------------------------
// 🧩 未処理エラー
// -------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error(`⚠️ Promise未処理拒否: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error('💥 未処理例外:', err);
});

module.exports = logger;
