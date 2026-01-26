const cron = require('node-cron');
const logger = require('../logger');
const { getAllSyutSchedules } = require('./syutConfigManager');
const { postTodaysCastAll } = require('./autoPost'); // 既存の投稿ロジックを再利用するが、引数は要調整かも

// 登録済みジョブを保持するリスト
let scheduledJobs = [];

/**
 * 全ギルドのスケジュールを再読み込みしてCronジョブを再登録する
 * @param {import('discord.js').Client} client 
 */
async function reloadSyutCron(client) {
  // 1. 既存ジョブを全停止・破棄
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs = [];
  logger.info('� [syutCron] 既存のスケジュールをクリアしました。');

  if (!client) {
    logger.warn('[syutCron] Clientが存在しないためスキップします。');
    return;
  }

  try {
    // 2. 所属ギルドID一覧を取得
    const guildIds = client.guilds.cache.map(g => g.id);

    // 3. 全スケジュールを取得
    const schedules = await getAllSyutSchedules(guildIds);

    if (schedules.length === 0) {
      logger.info('ℹ️ [syutCron] 有効な自動投稿設定はありません。');
      return;
    }

    // 4. 時間ごとにグループ化 (同じ時間のジョブをまとめるため)
    // Map<"HH:mm", Array<Schedule>>
    const timeMap = new Map();
    schedules.forEach(sch => {
      if (!timeMap.has(sch.time)) {
        timeMap.set(sch.time, []);
      }
      timeMap.get(sch.time).push(sch);
    });

    // 5. Cronジョブ登録
    for (const [time, targetList] of timeMap.entries()) {
      const [hour, minute] = time.split(':');
      // Cron形式: "分 時 * * *" (秒は省略可、node-cronは秒省略で毎分0秒実行)
      // JST指定で実行
      const cronExp = `${minute} ${hour} * * *`;

      const job = cron.schedule(cronExp, async () => {
        logger.info(`⏰ [syutCron] 自動投稿開始: ${time} (対象店舗: ${targetList.length}件)`);

        // autoPost.js のロジックを呼ぶ等
        // ここでは「特定の店舗」だけを処理するように autoPost.js を改修するか、
        // あるいは現在の postTodaysCastAll(client, time) が既に時間をフィルタリングしているので
        // そのまま呼べばOK。（ただし全ギルド走査になるので非効率化回避のためには改修推奨）
        // 今回の要件は「投稿リストを作成して...その時間に投稿」なので、
        // 既存の postTodaysCastAll(client, time) を呼べば、
        // 引数 time に一致するものだけ投稿されるロジックになっているので適合する。

        try {
          await postTodaysCastAll(client, time);
        } catch (err) {
          logger.error(`❌ [syutCron] 投稿処理エラー (${time}):`, err);
        }

      }, { timezone: 'Asia/Tokyo' });

      scheduledJobs.push(job);
    }

    logger.info(`✅ [syutCron] スケジュール登録完了: ${scheduledJobs.length}件のタイマー (対象合計: ${schedules.length}店舗)`);

  } catch (err) {
    logger.error('❌ [syutCron] スケジュール再読み込みエラー:', err);
  }
}

/**
 * 初期化（Bot起動時）
 */
function initSyutCron(client) {
  logger.info('🕒 [syutCron] スケジュール管理を開始します...');
  reloadSyutCron(client);
}

module.exports = { initSyutCron, reloadSyutCron };
