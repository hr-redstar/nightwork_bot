// @ts-check
/**
 * src/modules/sekkyaku/SekkyakuRepository.js
 * 接客ログの永続化管理 (GCS Standard)
 */

const { readJSON, saveJSON } = require('../../utils/gcs');

class SekkyakuRepository {
    /**
     * @param {string} guildId 
     */
    configPath(guildId) {
        return `${guildId}/sekkyaku/config.json`;
    }

    /**
     * @param {string} guildId 
     * @param {string} date YYYY-MM-DD
     */
    dailyLogPath(guildId, date) {
        return `${guildId}/sekkyaku/logs_${date}.json`;
    }

    /**
     * 設定取得
     */
    async getConfig(guildId) {
        return await readJSON(this.configPath(guildId)) || {
            targetChannelId: null,
            lastUpdated: null
        };
    }

    /**
     * 設定保存
     */
    async saveConfig(guildId, config) {
        config.lastUpdated = new Date().toISOString();
        await saveJSON(this.configPath(guildId), config);
    }

    /**
     * 日別ログ取得
     */
    async getDailyLogs(guildId, date) {
        return await readJSON(this.dailyLogPath(guildId, date)) || [];
    }

    /**
     * ログ保存
     */
    async saveDailyLogs(guildId, date, logs) {
        return await saveJSON(this.dailyLogPath(guildId, date), logs);
    }
}

module.exports = new SekkyakuRepository();
