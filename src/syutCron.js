/**
 * 出退勤自動投稿スケジューラ（開発用）
 * NODE_ENV=development のときのみ動作
 */

const cron = require('node-cron');
const { postTodaysCastAll } = require('./autoPost');

function initSyutCron(client) {
  if (process.env.NODE_ENV !== 'development') {
    console.log('🟡 本番モードのため node-cron は無効です。');
    return;
  }

  console.log('🕒 node-cron スケジュール起動（開発モード）');
  // 毎日13:00（Asia/Tokyo）に実行
  cron.schedule('0 13 * * *', async () => {
    try {
      console.log('📢 本日のキャスト自動投稿を実行中...');
      await postTodaysCastAll(client);
      console.log('✅ 自動投稿完了');
    } catch (err) {
      console.error('❌ 自動投稿エラー:', err);
    }
  }, { timezone: 'Asia/Tokyo' });
}

module.exports = { initSyutCron };
