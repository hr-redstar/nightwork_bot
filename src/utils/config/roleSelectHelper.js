// src/utils/config/roleSelectHelper.js
// ----------------------------------------------------
// 店舗_役職_ロール.json から「役職選択用 options」を作る共通ヘルパー
// ----------------------------------------------------

const logger = require('../logger');
const { loadStoreRoleConfig } = require('./storeRoleConfigManager');

/**
 * 役職一覧を StringSelectMenu 用 options に変換
 *  - config.roles: [{ id: "店長", name: "店長" }, ...] 前提
 * @param {string} guildId
 * @returns {Promise<{label: string, value: string}[]>}
 */
async function buildRoleSelectOptions(guildId) {
  try {
    const storeConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    if (!storeConfig || !Array.isArray(storeConfig.roles)) {
      logger.warn('[roleSelectHelper] roles 配列が見つかりません。');
      return [];
    }

    const options = storeConfig.roles.map((role) => ({
      label: role.name || role.id,
      value: role.id,
    }));

    return options.slice(0, 25);
  } catch (err) {
    logger.error('[roleSelectHelper] 役職オプション生成中にエラー:', err);
    return [];
  }
}

module.exports = {
  buildRoleSelectOptions,
};