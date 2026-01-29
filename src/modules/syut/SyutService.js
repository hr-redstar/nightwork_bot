// @ts-check
/**
 * src/modules/syut/SyutService.js
 * 出退勤機能のビジネスロジック (Platinum Evolution)
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./SyutRepository');
const logger = require('../../utils/logger');
const dayjs = require('dayjs');

class SyutService extends StoreServiceBase {
    /**
     * 設定パネル用のデータを準備
     */
    async prepareSettingData(guildId) {
        const config = await repo.getGlobalConfig(guildId);
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);
        return { config, storeRoleConfig };
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
        const today = dayjs().format('YYYY-MM-DD');
        const now = new Date();
        const timeStr = dayjs(now).format('HH:mm');

        // アトミック性を高めるため、保存直前に取得して更新
        const attendance = await repo.getDailyAttendance(guildId, storeName, today);
        const list = type === 'cast' ? attendance.cast : attendance.kurofuku;

        let userRecord = list.find((/** @type {any} */ r) => r.userId === userId);
        if (!userRecord) {
            userRecord = { userId, userName, punches: [], status: 'none' };
            list.push(userRecord);
        }

        // 状態更新
        userRecord.status = action === 'in' ? 'working' : 'finished';
        userRecord.punches.push({
            action,
            time: timeStr,
            timestamp: now.getTime()
        });

        await repo.saveDailyAttendance(guildId, storeName, today, attendance);

        logger.info(`[SyutService] ${type} ${action} : ${userName} at ${storeName}`);
        return { timeStr, userRecord, attendance };
    }

    /**
     * 特定店舗の今日の出勤キャストリストを取得 (店内状況パネル等で使用)
     */
    async getWorkingCasts(guildId, storeName) {
        const today = dayjs().format('YYYY-MM-DD');
        const attendance = await repo.getDailyAttendance(guildId, storeName, today);
        return attendance.cast.filter(c => c.status === 'working');
    }
}

module.exports = new SyutService();
