// @ts-check
/**
 * src/modules/syut/SyutRepository.js
 * 出退勤データのデータアクセスレイヤー (Platinum Standard)
 */

const { readJSON, saveJSON } = require('../../utils/gcs');

class SyutRepository {
    /**
     * @param {string} guildId 
     */
    configPath(guildId) {
        return `${guildId}/syut/config.json`;
    }

    /**
     * @param {string} guildId 
     * @param {string} storeName 
     * @param {string} date YYYY-MM-DD
     */
    attendancePath(guildId, storeName, date) {
        return `${guildId}/syut/attendance/${storeName}/${date}.json`;
    }

    /**
     * グローバル設定を取得
     */
    async getGlobalConfig(guildId) {
        return await readJSON(this.configPath(guildId)) || {
            castPanelList: {},
            kurofukuPanelList: {},
            lastUpdated: null
        };
    }

    /**
     * グローバル設定を保存
     */
    async saveGlobalConfig(guildId, data) {
        data.lastUpdated = new Date().toISOString();
        await saveJSON(this.configPath(guildId), data);
    }

    /**
     * 日別出退勤データを取得
     */
    async getDailyAttendance(guildId, storeName, date) {
        return await readJSON(this.attendancePath(guildId, storeName, date)) || {
            date,
            storeName,
            cast: [],
            kurofuku: []
        };
    }

    /**
     * 日別出退勤データを保存
     */
    async saveDailyAttendance(guildId, storeName, date, data) {
        await saveJSON(this.attendancePath(guildId, storeName, date), data);
    }
}

module.exports = new SyutRepository();
