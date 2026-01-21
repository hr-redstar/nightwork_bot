// src/events/ready.js
const { Events, ActivityType, Collection } = require('discord.js');
const logger = require('../utils/logger');
const { initializeGCS } = require('../utils/gcs');
const { initSyutCron } = require('../utils/syut/syutCron');

// ★ マイグレーション追加 ★
// const { migrateAllGuilds } = require('../utils/Migrator/storeRoleConfigMigrator');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      global.client = client;

      if (!client.commands) client.commands = new Collection();
      if (!client.buttons) client.buttons = new Collection();
      if (!client.modals) client.modals = new Collection();

      try {
        await client.user.setPresence({
          activities: [{ name: '設定パネルを監視中', type: ActivityType.Watching }],
          status: 'online',
        });
      } catch (e) {
        logger.warn('[ready] プレゼンス設定に失敗:', e.message || e);
      }

      const tag = client.user?.tag || 'unknown user';
      const guildCount = client.guilds.cache.size;
      logger.info(`✅ ログイン完了: ${tag} | 接続ギルド数: ${guildCount}`);

      // === GCS初期化 ===
      try {
        initializeGCS();
      } catch (e) {
        logger.warn('[ready] GCS初期化に失敗:', e?.stack || e);
      }

      // ⭐⭐⭐ ここでマイグレーション実行 ⭐⭐⭐
      // try {
      //   logger.info('🔧 全ギルド設定マイグレーション開始…');
      //   await migrateAllGuilds();
      // } catch (e) {
      //   logger.error('[ready] マイグレーション中にエラー:', e);
      // }

      // === 出退勤cron起動 ===
      try {
        initSyutCron(client);
        logger.info('⏰ 出退勤自動通知cron 起動済み');
      } catch (e) {
        logger.warn('[ready] 出退勤cron 初期化エラー:', e.message);
      }

      const env = process.env.NODE_ENV || 'development';
      logger.info(`🌐 環境: ${env} | GUILD_ID: ${process.env.GUILD_ID || 'N/A'}`);

      client.emit('clientReady');
    } catch (err) {
      logger.error('[ready] 初期化中エラー:', err);
    }
  },
};
