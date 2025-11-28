// src/utils/config/envConfig.js
// ----------------------------------------------------
// .env から環境変数を読み込み、アプリ全体で使用する共通設定
// ----------------------------------------------------

require('dotenv').config();

function parseBool(v) {
  return String(v).toLowerCase() === 'true';
}

function parseList(v) {
  if (!v) return [];
  return v.split(',').map(item => item.trim()).filter(Boolean);
}

const envConfig = {
  // ------------------------------------------
  // 基本
  // ------------------------------------------
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 開発ギルド（複数指定可能）
  DEV_GUILD_IDS: parseList(process.env.DEV_GUILD_IDS),

  // Discord BOT Token
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,

  // ------------------------------------------
  // GCS 設定
  // ------------------------------------------
  GCS_ENABLED: parseBool(process.env.GCS_ENABLED),
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
  GCP_SERVICE_KEY: process.env.GCP_SERVICE_KEY,

  // ------------------------------------------
  // デバッグ・指定ギルド
  // ------------------------------------------
  GUILD_ID: process.env.GUILD_ID || null,
};

module.exports = envConfig;