// src/events/ready.js
const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    try {
      // プレゼンス設定（任意の表示に調整可能）
      if (client.user?.setPresence) {
        await client.user.setPresence({
          activities: [{ name: '設定パネルを監視中', type: ActivityType.Watching }],
          status: 'online',
        });
      }

      logger.info(`✅ ログイン完了: ${client.user.tag}`);
      // 互換: index.js の client.once('clientReady') に通知
      client.emit('clientReady');
    } catch (err) {
      logger.error('[ready] 初期化中エラー:', err);
    }
  },
};
