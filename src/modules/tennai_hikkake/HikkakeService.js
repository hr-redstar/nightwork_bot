// @ts-check
/**
 * src/modules/tennai_hikkake/HikkakeService.js
 * 店内状況・ひっかけ機能のビジネスロジック
 */

const BaseService = require('../../structures/BaseService');
const repo = require('./HikkakeRepository');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} HikkakeConfig
 * @property {Record<string, { channelId: string, messageId: string }>} panels
 */

class HikkakeService extends BaseService {
    /**
     * 設定データを準備
     * @param {string} guildId
     * @returns {Promise<{ config: HikkakeConfig }>}
     */
    async prepareSettingData(guildId) {
        const config = await repo.getGlobalConfig(guildId);
        return { config };
    }
}

module.exports = new HikkakeService();
