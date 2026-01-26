/**
 * src/utils/logger.js
 * ログ出力ユーティリティ
 * ---------------------------------------
 * - winstonベースの統一ロガー
 * - Cloud Run / GitHub Actions / ローカル共通
 * - エラー時にstack traceも出力
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const settings = require('../config/settings');

// -------------------------------------------------------------
// 📁 ログ出力ディレクトリ設定（任意）
// -------------------------------------------------------------
const LOG_DIR = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 🧩 ロガー本体設定
// -------------------------------------------------------------
const isProd = settings.nodeEnv === 'production';
const baseFormat = [
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
];

const devFormat = winston.format.combine(
  ...baseFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const base = `[${level} ${timestamp}] ${message}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

const prodFormat = winston.format.combine(
  ...baseFormat,
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const base = `[${level.toUpperCase()} ${timestamp}] ${message}`;
    return stack ? `${base}\n${stack}` : base;
  })
);

const logger = winston.createLogger({
  level: settings.logLevel, // settings.jsから取得
  format: isProd ? prodFormat : devFormat,
  transports: [
    // --- コンソール出力 ---
    new winston.transports.Console(),

    // --- ファイル出力（任意） ---
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MBでローテーション
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
    }),
  ],
});

// -------------------------------------------------------------
// 🧩 未処理エラーの監視
// -------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error(`⚠️ Promise未処理拒否: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error('💥 未処理例外:', err);
});

// -------------------------------------------------------------
// 🧩 子ロガー生成
// -------------------------------------------------------------
logger.child = (opts = {}) => {
  const label = opts.label || opts.module || 'app';
  return {
    info: (msg) => logger.info(`[${label}] ${msg}`),
    warn: (msg) => logger.warn(`[${label}] ${msg}`),
    error: (msg, err) => logger.error(`[${label}] ${msg}`, err),
    debug: (...args) => logger.debug(`[${label}] ${args.join(' ')}`),
  };
};

// -------------------------------------------------------------
// 🧩 エクスポート
// -------------------------------------------------------------
module.exports = logger;
