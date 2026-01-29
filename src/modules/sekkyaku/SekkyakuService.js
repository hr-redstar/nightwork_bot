// @ts-check
/**
 * src/modules/sekkyaku/SekkyakuService.js
 * 接客ログのビジネスロジック (Platinum Power)
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./SekkyakuRepository');
const hikkakeRepo = require('../tennai_hikkake/HikkakeRepository'); // 連携用
const dayjs = require('dayjs');
const logger = require('../../utils/logger');

class SekkyakuService extends StoreServiceBase {
    /**
     * 設定データを準備
     */
    async prepareSettingData(guildId) {
        const config = await repo.getConfig(guildId);
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);
        return { config, storeRoleConfig };
    }

    /**
     * 接客開始処理
     * @param {string} guildId 
     * @param {object} data
     */
    async startSekkyaku(guildId, { storeName, groupCount, customerCount, castNames, inputUser }) {
        const today = dayjs().format('YYYY-MM-DD');
        const logs = await repo.getDailyLogs(guildId, today);

        const newLog = {
            id: Date.now().toString(),
            type: '確定', // 接客開始 = 確定入店
            store: storeName,
            group: groupCount,
            num: parseInt(customerCount, 10),
            castList: Array.isArray(castNames) ? castNames : [castNames],
            enterTime: dayjs().format('HH:mm'),
            inputUser,
            status: 'active', // 接客中
            startTime: new Date().toISOString()
        };

        logs.push(newLog);
        await repo.saveDailyLogs(guildId, today, logs);

        // --- 店内状況（ひっかけ）との同期 ---
        // 接客ログの「確定」データを、店内状況の「一日の接客ログ」としても反映させる
        await this.syncToHikkake(guildId, storeName, newLog);

        return newLog;
    }

    /**
     * 店内状況モジュールへのデータプッシュ
     */
    async syncToHikkake(guildId, storeName, logEntry) {
        try {
            const hikkakeLogs = await hikkakeRepo.getDailyLogs(guildId);
            hikkakeLogs.push(logEntry);
            await hikkakeRepo.saveDailyLogs(guildId, hikkakeLogs);
            logger.debug(`[SekkyakuService] Synced log to Hikkake: ${storeName}`);
        } catch (err) {
            logger.error('[SekkyakuService] Hikkake sync failed:', err);
        }
    }
}

module.exports = new SekkyakuService();
