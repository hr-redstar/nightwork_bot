const path = require('path');
const { readJSON, saveJSON } = require('./gcs');
const logger = require('./logger');

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
     * データバリデーション（継承先で実装必須）
     * @param {Object} data 
     * @throws {Error} バリデーションエラー
     */
    validate(data) {
        // デフォルトは何もしない（継承先でオーバーライド推奨）
        // throw new Error('validate() must be implemented in subclass');
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
     * JSON読み込み（共通）- エラー処理完全カプセル化
     */
    async _load(filePath, defaults = {}) {
        try {
            const data = await readJSON(filePath);
            const merged = { ...defaults, ...(data || {}) };

            // バリデーション実行
            this.validate(merged);

            return merged;
        } catch (err) {
            if (err && err.code === 'ENOENT') {
                // ファイルが存在しない場合はデフォルト値を返す
                return { ...defaults };
            }

            // その他のエラーは詳細情報を付与して再スロー
            throw new Error(`[${this.constructor.name}] Failed to load config from ${filePath}: ${err.message}`);
        }
    }

    /**
     * JSON保存（共通）- エラー処理完全カプセル化
     */
    async _save(filePath, data) {
        try {
            // バリデーション実行
            this.validate(data);

            await saveJSON(filePath, data || {});
            return data;
        } catch (err) {
            throw new Error(`[${this.constructor.name}] Failed to save config to ${filePath}: ${err.message}`);
        }
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
