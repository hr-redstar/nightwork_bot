// @ts-check
/**
 * src/modules/tennai_hikkake/HikkakeRepository.js
 * 店内状況・ひっかけ機能のデータアクセスレイヤー (Standard GCS Ver.)
 */

const { readJSON, saveJSON } = require('../../utils/gcs');

class HikkakeRepository {
    /**
     * @param {string} guildId 
     */
    configPath(guildId) {
        return `${guildId}/tennai_hikkake/config.json`;
    }

    /**
     * @param {string} guildId 
     */
    logPath(guildId) {
        return `${guildId}/tennai_hikkake/daily_logs.json`; // その日の接客ログ
    }

    /**
     * グローバル設定を取得
     * @param {string} guildId 
     */
    async getGlobalConfig(guildId) {
        return await readJSON(this.configPath(guildId)) || {
            panels: {},
            approveRoleId: null,
            lastUpdated: null
        };
    }

    /**
     * 設定を保存
     * @param {string} guildId 
     * @param {any} data 
     */
    async saveGlobalConfig(guildId, data) {
        data.lastUpdated = new Date().toISOString();
        return await saveJSON(this.configPath(guildId), data);
    }

    /**
     * 接客ログを取得
     * @param {string} guildId 
     */
    async getDailyLogs(guildId) {
        return await readJSON(this.logPath(guildId)) || [];
    }

    /**
     * 接客ログを保存
     * @param {string} guildId 
     * @param {any[]} logs 
     */
    async saveDailyLogs(guildId, logs) {
        return await saveJSON(this.logPath(guildId), logs);
    }
}

module.exports = new HikkakeRepository();
