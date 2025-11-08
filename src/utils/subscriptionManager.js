// src/utils/subscriptionManager.js
const fs = require('fs');
const path = require('path');

// 契約データをローカルJSONで保持（将来的にはDB化想定）
const SUBSCRIPTION_PATH = path.join(__dirname, '../../data-svml/subscription.json');

/**
 * サブスクリプション契約状態を取得
 * @param {string} guildId DiscordギルドID
 * @returns {boolean} true = 契約中, false = 未契約
 */
function isGuildSubscribed(guildId) {
  if (!fs.existsSync(SUBSCRIPTION_PATH)) return false;

  const data = JSON.parse(fs.readFileSync(SUBSCRIPTION_PATH, 'utf8'));
  const guild = data.guilds?.find(g => g.id === guildId);

  return guild?.active === true;
}

/**
 * 契約データの登録・更新（管理用）
 */
function setSubscriptionStatus(guildId, active) {
  let data = { guilds: [] };
  if (fs.existsSync(SUBSCRIPTION_PATH)) {
    data = JSON.parse(fs.readFileSync(SUBSCRIPTION_PATH, 'utf8'));
  }

  const existing = data.guilds.find(g => g.id === guildId);
  if (existing) {
    existing.active = active;
  } else {
    data.guilds.push({ id: guildId, active });
  }

  fs.writeFileSync(SUBSCRIPTION_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { isGuildSubscribed, setSubscriptionStatus };
