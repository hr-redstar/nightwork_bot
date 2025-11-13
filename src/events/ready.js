// src/events/ready.js
const { Events, ActivityType, Collection } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    try {
      // グローバル参照を設定しておく（utils 等が参照するため）
      try { global.client = client; } catch {}

      // client にコマンド/ボタンコレクションが無ければ初期化
      if (!client.commands) client.commands = new Collection();
      if (!client.buttons) client.buttons = new Collection();

      // プレゼンス設定（任意の表示に調整可能）
      try {
        if (client.user?.setPresence) {
          await client.user.setPresence({
            activities: [{ name: '設定パネルを監視中', type: ActivityType.Watching }],
            status: 'online',
          });
        } else if (client.user?.setActivity) {
          // 互換性のため setActivity がある場合はそちらを使う
          client.user.setActivity('設定パネルを監視中');
        }
      } catch (e) {
        logger.warn('[ready] プレゼンス設定に失敗しました:', e?.message || e);
      }

      logger.info(`✅ ログイン完了: ${client.user?.tag || client.user?.id || 'unknown'}`);

      // ギルド数 / 登録済みコマンド等の情報を出す
      try {
        const guildCount = client.guilds.cache.size;
        logger.info(`🔌 接続ギルド数: ${guildCount}`);
      } catch (e) { /* ignore */ }

      // 互換: index.js の client.once('clientReady') に通知
      try { client.emit('clientReady'); } catch (e) { logger.warn('[ready] clientReady emit 失敗:', e?.message || e); }

      // プロセスの未処理例外監視（簡易）
      process.on('unhandledRejection', (reason, p) => {
        logger.error('[unhandledRejection]', { reason, p });
      });
      process.on('uncaughtException', (err) => {
        logger.error('[uncaughtException]', err);
      });
    } catch (err) {
      logger.error('[ready] 初期化中エラー:', err);
    }
  },
};
