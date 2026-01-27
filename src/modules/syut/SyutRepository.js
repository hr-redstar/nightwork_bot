/**
 * src/modules/syut/SyutRepository.js
 * 出退勤データのデータアクセスレイヤー
 */

const BaseRepository = require('../../structures/BaseRepository');
const {
    getSyutConfig,
    saveSyutConfig,
    getPanelConfig,
    setPanelConfig,
    getRoleConfig,
    setRoleConfig,
    getDailySyuttaikin,
    saveDailySyuttaikin
} = require('../../utils/syut/syutConfigManager');

class SyutRepository extends BaseRepository {
    constructor() {
        super(null); // Syut handles path dynamic, so we wrap helpers
    }

    async getGlobalConfig(guildId) {
        return await getSyutConfig(guildId);
    }

    async saveGlobalConfig(guildId, data) {
        return await saveSyutConfig(guildId, data);
    }

    async getStorePanelConfig(guildId, type, storeName) {
        return await getPanelConfig(guildId, type, storeName);
    }

    async saveStorePanelConfig(guildId, type, storeName, data) {
        return await setPanelConfig(guildId, type, storeName, data);
    }

    async getStoreRoleConfig(guildId, type, storeName) {
        return await getRoleConfig(guildId, type, storeName);
    }

    async saveStoreRoleConfig(guildId, type, storeName, data) {
        return await setRoleConfig(guildId, type, storeName, data);
    }

    async getDailyAttendance(guildId, storeName, date) {
        return await getDailySyuttaikin(guildId, storeName, date);
    }

    async saveDailyAttendance(guildId, storeName, date, data) {
        return await saveDailySyuttaikin(guildId, storeName, date, data);
    }
}

module.exports = new SyutRepository();
