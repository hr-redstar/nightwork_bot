// src/utils/config/envConfig.js
require('dotenv').config();

const envConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
    DEV_GUILD_IDS: process.env.DEV_GUILD_IDS
        ? process.env.DEV_GUILD_IDS.split(',').map(id => id.trim())
        : [],
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME,
  GCS_ENABLED: process.env.GCS_ENABLED === 'true',
  GUILD_ID: process.env.GUILD_ID,
};

module.exports = envConfig;