// @ts-check
/**
 * src/modules/hearing_log/HearingRepository.js
 * ヒアリングログの設定およびインデックスの永続化
 */

const { readJSON, saveJSON } = require('../../utils/gcs');
const logger = require('../../utils/logger');

class HearingRepository {
    /**
     * @param {string} guildId 
     */
    configPath(guildId) {
        return `${guildId}/hearing_log/config.json`;
    }

    /**
     * @param {string} guildId 
     */
    indexPath(guildId) {
        return `${guildId}/hearing_log/index.json`;
    }

    /**
     * グローバル設定を取得
     * @param {string} guildId 
     */
    async getConfig(guildId) {
        try {
            return (await readJSON(this.configPath(guildId))) || {
                panelChannelId: null,
                panelMessageId: null,
                targetChannelId: null,
                currentThreadId: null,
                currentThreadCount: 0,
                threadSuffix: 1
            };
        } catch (err) {
            return { targetChannelId: null };
        }
    }

    /**
     * 設定を保存
     * @param {string} guildId 
     * @param {any} config 
     */
    async saveConfig(guildId, config) {
        await saveJSON(this.configPath(guildId), config);
    }

    /**
     * 検索用インデックスを取得
     * @param {string} guildId 
     */
    async getIndex(guildId) {
        try {
            return (await readJSON(this.indexPath(guildId))) || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * インデックスを保存
     * @param {string} guildId 
     * @param {any[]} index 
     */
    async saveIndex(guildId, index) {
        await saveJSON(this.indexPath(guildId), index);
    }
}

module.exports = new HearingRepository();
