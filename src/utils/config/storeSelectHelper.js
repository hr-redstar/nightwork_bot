// src/utils/config/storeSelectHelper.js
// ----------------------------------------------------
// 店舗_役職_ロール.json から「店舗選択用 options」を作る共通ヘルパー
// ----------------------------------------------------

const logger = require('../logger');
const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

/**
 * 店舗一覧を StringSelectMenu 用 options に変換
 *  - config.stores: ["本社", "test店舗A", ...] 前提
 * @param {string} guildId
 * @returns {Promise<{label: string, value: string}[]>}
 */
async function buildStoreSelectOptions(guildId) {
  try {
    const storeConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    // storeConfig自体がnullの場合、またはstoresが配列でない（または存在しない）場合
    if (!storeConfig || !Array.isArray(storeConfig.stores) || storeConfig.stores.length === 0) {
      logger.warn('[storeSelectHelper] stores 配列が見つかりません。');
      return [];
    }

    const options = storeConfig.stores.map((storeName) => ({
      label: storeName,
      value: storeName, // 店舗名をそのまま value に
    }));

    // Discord のセレクトは最大 25 件
    return options.slice(0, 25);
  } catch (err) {
    logger.error('[storeSelectHelper] 店舗オプション生成中にエラー:', err);
    return [];
  }
}

module.exports = {
  buildStoreSelectOptions,
};