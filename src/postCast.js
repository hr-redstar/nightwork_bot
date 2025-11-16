const express = require('express');
const router = express.Router();
const { postTodaysCastAll } = require('./utils/syut/autoPost');

// Cloud Scheduler からの HTTP POST
router.post('/auto/postCast', async (req, res) => {
  try {
    // Cloud Runではグローバルなclientオブジェクトが利用できる想定
    const client = global.client || require('../../botClient').client;
    await postTodaysCastAll(client);
    return res.status(200).send('✅ 本日のキャスト自動投稿完了');
  } catch (err) {
    console.error('❌ Cloud Scheduler 投稿エラー:', err);
    return res.status(500).send('Internal Error');
  }
});

module.exports = router;