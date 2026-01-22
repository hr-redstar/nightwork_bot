const cron = require('node-cron');
const logger = require('../logger');
const { postTodaysCastAll } = require('./autoPost');

function initSyutCron(client) {
  // if (process.env.NODE_ENV !== 'development') {
  //   logger.info('🟡 本番モードのため node-cron は無効です。');
  //   return;
  // }
  logger.info('🕒 node-cron スケジュール起動');
  
  // 1分ごとに実行し、設定時刻と一致する店舗があれば投稿
  cron.schedule('* * * * *', async () => {
    try {
      // 現在時刻(JST)を取得して HH:mm 形式にする
      const now = new Date();
      const currentTime = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now);

      await postTodaysCastAll(client, currentTime);
    } catch (err) {
      logger.error('❌ 自動投稿チェックエラー:', err);
    }
  }, { timezone: 'Asia/Tokyo' });
}

module.exports = { initSyutCron };
