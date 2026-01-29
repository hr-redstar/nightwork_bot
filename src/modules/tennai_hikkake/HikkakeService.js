// @ts-check
/**
 * src/modules/tennai_hikkake/HikkakeService.js
 * 店内状況・ひっかけ機能のビジネスロジック (Platinum Power)
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./HikkakeRepository');
const logger = require('../../utils/logger');

class HikkakeService extends StoreServiceBase {
    /**
     * 設定画面用データを準備
     * @param {string} guildId 
     */
    async prepareSettingData(guildId) {
        const config = await repo.getGlobalConfig(guildId);
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);
        return { config, storeRoleConfig };
    }

    /**
     * 特定店舗の計算済みデータを取得
     * @param {string} guildId 
     * @param {string} storeName 
     */
    async getStoreSummary(guildId, storeName) {
        // 出退勤データ (CastAttendanceService または Repositoryから取得)
        // ※ 本来は他モジュールとの連携が必要だが、一旦 Repository 経由のスタブまたは共通化
        // ここでは Platinum 化の第1段階として、構造を整理
        const logs = await repo.getDailyLogs(guildId);
        const config = await repo.getGlobalConfig(guildId);

        // 接客中計算
        const storeLogs = logs.filter(l => l.store === storeName);
        const attendingCount = storeLogs
            .filter(l => l.type === '確定')
            .reduce((sum, l) => sum + (l.num || 0), 0);

        return {
            logs: storeLogs,
            attendingCount,
            config
        };
    }
}

module.exports = new HikkakeService();
