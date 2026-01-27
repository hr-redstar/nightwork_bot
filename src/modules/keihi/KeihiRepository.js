/**
 * src/modules/keihi/KeihiRepository.js
 * 経費データのデータアクセスレイヤー
 */

const BaseRepository = require('../../structures/BaseRepository');
const { manager } = require('../../utils/keihi/keihiConfigManager');

class KeihiRepository extends BaseRepository {
    constructor() {
        super(manager);
    }

    /**
     * 店舗別の経費設定を読み込み
     */
    async getStoreConfig(guildId, storeId) {
        return await this.find(guildId, storeId);
    }

    /**
     * グローバルの経費設定を読み込み
     */
    async getGlobalConfig(guildId) {
        return await this.find(guildId);
    }
}

module.exports = new KeihiRepository();
