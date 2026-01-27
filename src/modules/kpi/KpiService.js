// @ts-check
/**
 * src/modules/kpi/KpiService.js
 * KPI機能のビジネスロジック
 */

const BaseService = require('../../structures/BaseService');
const repo = require('./KpiRepository');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} KpiConfig
 * @property {string} [approveRoleId]
 * @property {Record<string, string>} [channels]
 */

/**
 * KPI機能のビジネスロジック
 */
class KpiService extends BaseService {
    /**
     * 設定データを準備
     * @param {string} guildId
     * @returns {Promise<{ config: KpiConfig }>}
     */
    async prepareSettingData(guildId) {
        const config = await repo.getConfig(guildId);
        return { config };
    }

    /**
     * 店舗ごとのKPI投稿先チャンネルを解決
     * @param {KpiConfig} config
     * @param {string} storeId
     * @returns {string | null}
     */
    resolveStoreChannel(config, storeId) {
        return config.channels?.[storeId] || null;
    }
}

module.exports = new KpiService();
