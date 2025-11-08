/**
 * GCS サブスク契約データ管理
 */
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

/**
 * ギルドの契約履歴全体を取得
 * @param {string} guildId
 * @returns {Promise<object[]|null>}
 */
async function getSubscription(guildId) {
  try {
    // Web API (`hp/`) のパス構造に合わせる
    const file = storage.bucket(BUCKET_NAME).file(`${guildId}/subscriptions.json`);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (err) {
    console.error(`[GCS Subscription] 読み込み失敗 (guildId: ${guildId}):`, err);
    return null;
  }
}

/**
 * ギルドの契約履歴全体を保存
 * @param {string} guildId
 * @param {object[]} subscriptions - 契約履歴の配列
 * @returns {Promise<boolean>}
 */
async function saveSubscription(guildId, subscriptions) {
  try {
    const file = storage.bucket(BUCKET_NAME).file(`${guildId}/subscriptions.json`);
    await file.save(JSON.stringify(subscriptions, null, 2), { contentType: 'application/json' });
    return true;
  } catch (err) {
    console.error(`[GCS Subscription] 保存失敗 (guildId: ${guildId}):`, err);
    return false;
  }
}

/**
 * 指定ギルドがプレミアム契約中かを確認 (isPremiumGuild相当)
 * @param {string} guildId - DiscordギルドID
 * @returns {Promise<boolean>}
 */
async function isActive(guildId) {
  try {
    const subscriptions = await getSubscription(guildId);
    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return false;
    }

    // 最新の契約情報を取得
    const latest = subscriptions[subscriptions.length - 1];

    // ステータスが 'active' で、プランが 'premium' であることを確認
    if (latest.status !== 'active' || latest.plan !== 'premium') {
      return false;
    }

    // 契約期限をチェック (expiresAtがnullの場合は無期限とみなす)
    if (latest.expiresAt && new Date(latest.expiresAt) < new Date()) {
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[isActive] エラー (guildId: ${guildId}):`, err.message);
    return false;
  }
}

module.exports = { getSubscription, saveSubscription, isActive };
