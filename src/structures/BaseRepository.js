/**
 * src/structures/BaseRepository.js
 * データアクセスの基底クラス
 * ※現在はConfigManager等を使用しているが、将来的にDB移行などがあった際に
 *   ビジネスロジックへの影響を最小限にするための抽象レイヤー
 */

class BaseRepository {
    constructor(manager) {
        this.manager = manager;
    }

    async find(guildId, storeId) {
        if (storeId) {
            return await this.manager.loadStore(guildId, storeId);
        }
        return await this.manager.loadGlobal(guildId);
    }

    async save(guildId, data, storeId) {
        if (storeId) {
            return await this.manager.saveStore(guildId, storeId, data);
        }
        return await this.manager.saveGlobal(guildId, data);
    }
}

module.exports = BaseRepository;
