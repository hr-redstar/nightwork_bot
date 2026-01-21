// src/utils/subscriptionManager.js
const fs = require('fs');
const path = require('path');
const { DEV_GUILD_IDS } = require('./config/envConfig'); // ← 追加
const logger = require('./logger');

// 契約データをローカルJSONで保持（将来的にはDB化想定）
const SUBSCRIPTION_PATH = path.join(__dirname, '../../data-svml/subscription.json');

/**
 * サブスクリプション契約状態を取得
 * @param {string} guildId DiscordギルドID
 * @returns {boolean} true = 契約中, false = 未契約
 */
function isGuildSubscribed(guildId) {
  // 🧪 開発ホワイトリストを優先判定
  if (DEV_GUILD_IDS.includes(guildId)) {
    logger.info(`🧪 開発ホワイトリスト適用: ${guildId} → 無制限モード`);
    return true;
  }

  if (!fs.existsSync(SUBSCRIPTION_PATH)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(SUBSCRIPTION_PATH, 'utf8'));
    const guild = data.guilds?.find(g => g.id === guildId);
    return guild?.active === true;
  } catch (err) {
    logger.error('⚠️ サブスクリプションデータ読み込みエラー:', err);
    return false;
  }
}

/**
 * 契約データの登録・更新（管理用）
 */
function setSubscriptionStatus(guildId, active) {
  let data = { guilds: [] };
  if (fs.existsSync(SUBSCRIPTION_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(SUBSCRIPTION_PATH, 'utf8'));
    } catch {
      logger.warn('⚠️ subscription.json が壊れているため再作成します。');
    }
  }

  const existing = data.guilds.find(g => g.id === guildId);
  if (existing) {
    existing.active = active;
  } else {
    data.guilds.push({ id: guildId, active });
  }

  fs.writeFileSync(SUBSCRIPTION_PATH, JSON.stringify(data, null, 2), 'utf8');
  logger.info(`💾 契約状態を更新しました: ${guildId} → ${active ? '有効' : '無効'}`);
}

module.exports = { isGuildSubscribed, setSubscriptionStatus };
