/**
 * src/modules/uriage/UriageRepository.js
 * 売上データのデータアクセスレイヤー
 */

const BaseRepository = require('../../structures/BaseRepository');
const { manager } = require('../../utils/uriage/uriageConfigManager');

class UriageRepository extends BaseRepository {
    constructor() {
        super(manager);
    }

    async getStoreConfig(guildId, storeId) {
        return await this.find(guildId, storeId);
    }

    async getGlobalConfig(guildId) {
        return await this.find(guildId);
    }
}

module.exports = new UriageRepository();
