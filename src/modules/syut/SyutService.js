// @ts-check
/**
 * src/modules/syut/SyutService.js
 * 出退勤機能のビジネスロジック
 */

const BaseService = require('../../structures/BaseService');
const repo = require('./SyutRepository');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} SyutConfig
 * @property {Record<string, any>} castPanelList
 * @property {Record<string, any>} kurofukuPanelList
 * @property {string} [approveRoleId]
 */

class SyutService extends BaseService {
    /**
     * 設定パネル用のデータを準備
     * @param {string} guildId
     */
    async prepareSettingData(guildId) {
        const config = await repo.getGlobalConfig(guildId);
        return { config };
    }

    /**
     * 打刻処理 (共通コアロジック)
     * @param {string} guildId 
     * @param {string} storeName 
     * @param {string} userId 
     * @param {string} userName 
     * @param {'cast'|'kurofuku'} type 
     * @param {'in'|'out'} action 
     */
    async processPunch(guildId, storeName, userId, userName, type, action) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const attendance = await repo.getDailyAttendance(guildId, storeName, today);
        const list = type === 'cast' ? attendance.cast : attendance.kurofuku;

        let userRecord = list.find((/** @type {any} */ r) => r.userId === userId);
        if (!userRecord) {
            userRecord = { userId, userName, punches: [] };
            list.push(userRecord);
        }

        userRecord.punches.push({ action, time: timeStr, timestamp: now.getTime() });

        await repo.saveDailyAttendance(guildId, storeName, today, attendance);

        logger.info(`[SyutService] Punched ${action} for ${userName} (${userId}) at ${storeName}`);
        return { timeStr, userRecord };
    }
}

module.exports = new SyutService();
