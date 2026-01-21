const cron = require('node-cron');
const logger = require('../logger');
const { postTodaysCastAll } = require('./autoPost');

function initSyutCron(client) {
  // if (process.env.NODE_ENV !== 'development') {
  //   logger.info('🟡 本番モードのため node-cron は無効です。');
  //   return;
  // }
  logger.info('🕒 node-cron スケジュール起動');
  // 毎日13:00（Asia/Tokyo）に実行
  cron.schedule('0 13 * * *', async () => {
    try {
      logger.info('📢 本日のキャスト自動投稿を実行中...');
      await postTodaysCastAll(client);
      logger.info('✅ 自動投稿完了');
    } catch (err) {
      logger.error('❌ 自動投稿エラー:', err);
    }
  }, { timezone: 'Asia/Tokyo' });
}

module.exports = { initSyutCron };
