/**
 * src/config/settings.js
 * 環境変数の集約管理
 */
require('dotenv').config();

module.exports = {
    // アプリケーション設定
    nodeEnv: process.env.NODE_ENV || 'development',
    guildId: process.env.GUILD_ID,

    // Discord設定
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    devGuildIds: (process.env.DEV_GUILD_IDS || '').split(',').filter(Boolean),

    // GCS設定
    gcsEnabled: process.env.USE_GCS === 'true' || process.env.GCS_ENABLED === 'true',
    gcsBucketName: process.env.GCS_BUCKET_NAME || '',

    // ログ設定
    logLevel: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
};
