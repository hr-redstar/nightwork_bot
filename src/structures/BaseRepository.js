/**
 * src/structures/BaseRepository.js
 * リポジトリ層の基底クラス (データアクセス標準化)
 */

const StorageFactory = require('../utils/storage/StorageFactory');

class BaseRepository {
    /**
     * @param {string} moduleName モジュール名 (例: 'level', 'welcome')
     * @param {string} fileName ファイル名 (例: 'config.json')
     */
    constructor(moduleName, fileName = 'config.json') {
        this.moduleName = moduleName;
        this.fileName = fileName;
        this.storage = StorageFactory.getInstance();
    }

    /**
     * パス生成 (GCS/{guildId}/{moduleName}/{fileName})
     */
    getPath(guildId) {
        return `GCS/${guildId}/${this.moduleName}/${this.fileName}`;
    }

    /**
     * データ読み込み
     */
    async load(guildId, defaultValue = {}) {
        return await this.storage.readJSON(this.getPath(guildId), defaultValue);
    }

    /**
     * データ保存
     */
    async save(guildId, data) {
        return await this.storage.writeJSON(this.getPath(guildId), data);
    }
}

module.exports = BaseRepository;
