// src/utils/config/storeSelectHelper.js
// ----------------------------------------------------
// 店舗_役職_ロール.json から店舗選択用 options を作る共通ヘルパー
// ----------------------------------------------------

const logger = require('../logger');
const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

/**
 * 店舗一覧を StringSelectMenu 用 options に変換
 * - 配列: ["本社", ...] または [{ id, name }, ...]
 * - オブジェクト: { "<id>": { name, ... }, ... }
 * @param {string} guildId
 * @returns {Promise<{label: string, value: string}[]>}
 */
async function buildStoreSelectOptions(guildId) {
  try {
    const storeConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    if (!storeConfig) {
      logger.warn('[storeSelectHelper] storeRoleConfig が読み込めませんでした');
      return [];
    }

    let options = [];

    // 配列: ["A", "B"] or [{ id, name }, ...]
    if (Array.isArray(storeConfig.stores)) {
      options = storeConfig.stores.map((store, idx) => {
        if (typeof store === 'string') {
          return { label: store, value: store };
        }
        const id = store.id ?? store.storeId ?? idx;
        const name = store.name ?? store.storeName ?? `店舗${id}`;
        return { label: String(name), value: String(store.id ?? name) };
      });
    } else if (storeConfig && typeof storeConfig === 'object') {
      // オブジェクト { "<id>": { name }, ... }
      options = Object.entries(storeConfig).map(([storeId, store]) => {
        const name = (store && (store.name ?? store.storeName)) || storeId;
        return { label: String(name), value: String(storeId) };
      });
    }

    if (!options.length) {
      logger.warn('[storeSelectHelper] stores 配列/オブジェクトが空でした');
      return [];
    }

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
