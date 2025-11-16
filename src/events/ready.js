// src/events/ready.js
const { Events, ActivityType, Collection } = require('discord.js');
const logger = require('../utils/logger');
const { initGCS } = require('../utils/gcsClient');
const { initSyutCron } = require('../utils/syut/syutCron');

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    try {
      // === グローバル設定 ===
      global.client = client;

      // コレクション初期化（未定義時のみ）
      if (!client.commands) client.commands = new Collection();
      if (!client.buttons) client.buttons = new Collection();
      if (!client.modals) client.modals = new Collection();

      // === プレゼンス設定 ===
      try {
        await client.user.setPresence({
          activities: [{ name: '設定パネルを監視中', type: ActivityType.Watching }],
          status: 'online',
        });
      } catch (e) {
        logger.warn('[ready] プレゼンス設定に失敗:', e.message || e);
      }

      // === 起動ログ ===
      const tag = client.user?.tag || 'unknown user';
      const guildCount = client.guilds.cache.size;
      logger.info(`✅ ログイン完了: ${tag} | 接続ギルド数: ${guildCount}`);

      // === GCS初期化 ===
      try {
        initGCS();
      } catch (e) {
        logger.warn('[ready] GCS初期化に失敗:', e.message);
      }

      // === 出退勤cron起動 ===
      try {
        initSyutCron(client);
        logger.info('⏰ 出退勤自動通知cron 起動済み');
      } catch (e) {
        logger.warn('[ready] 出退勤cron 初期化エラー:', e.message);
      }

      // === 開発用通知 ===
      const env = process.env.NODE_ENV || 'development';
      logger.info(`🌐 環境: ${env} | GUILD_ID: ${process.env.GUILD_ID || 'N/A'}`);

      // clientReady イベント通知（必要なモジュールが待機できるように）
      client.emit('clientReady');
    } catch (err) {
      logger.error('[ready] 初期化中エラー:', err);
    }
  },
};
