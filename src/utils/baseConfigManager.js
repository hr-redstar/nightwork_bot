const path = require('path');
const { readJSON, saveJSON } = require('./gcs');

/**
 * 設定管理の基底クラス
 * GCS上のJSONファイルの読み書きを共通化する
 */
class BaseConfigManager {
    /**
     * @param {Object} options
     * @param {string} options.baseDir - 機能ディレクトリ名 (例: 'keihi', 'uriage')
     * @param {string} options.fileName - 設定ファイル名 (例: 'config.json')
     */
    constructor({ baseDir, fileName = 'config.json' }) {
        this.baseDir = baseDir;
        this.fileName = fileName;
    }

    /**
     * ギルド共通設定のパスを生成
     * GCS/{guildId}/{baseDir}/{fileName}
     */
    getGlobalPath(guildId) {
        if (!guildId) throw new Error(`[${this.constructor.name}] guildId is required`);
        return path.join('GCS', guildId, this.baseDir, this.fileName);
    }

    /**
     * 店舗別設定のパスを生成
     * GCS/{guildId}/{baseDir}/{storeId}/{fileName}
     */
    getStorePath(guildId, storeId) {
        if (!guildId || !storeId) throw new Error(`[${this.constructor.name}] guildId and storeId are required`);
        return path.join('GCS', guildId, this.baseDir, storeId, this.fileName);
    }

    /**
     * JSON読み込み（共通）
     */
    async _load(filePath, defaults = {}) {
        try {
            const data = await readJSON(filePath);
            return { ...defaults, ...(data || {}) };
        } catch (err) {
            if (err && err.code === 'ENOENT') return { ...defaults };
            throw err;
        }
    }

    /**
     * JSON保存（共通）
     */
    async _save(filePath, data) {
        await saveJSON(filePath, data || {});
        return data;
    }

    // --- Public API ---

    async loadGlobal(guildId, defaults = {}) {
        return this._load(this.getGlobalPath(guildId), defaults);
    }

    async saveGlobal(guildId, data) {
        return this._save(this.getGlobalPath(guildId), data);
    }

    async loadStore(guildId, storeId, defaults = {}) {
        return this._load(this.getStorePath(guildId, storeId), defaults);
    }

    async saveStore(guildId, storeId, data) {
        return this._save(this.getStorePath(guildId, storeId), data);
    }
}

module.exports = BaseConfigManager;
