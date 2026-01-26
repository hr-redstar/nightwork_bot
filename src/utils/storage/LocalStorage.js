/**
 * src/utils/storage/LocalStorage.js
 * ローカルファイルシステムを使用したストレージ実装
 */

const fs = require('fs/promises');
const path = require('path');
const StorageInterface = require('./StorageInterface');
const logger = require('../logger');

class LocalStorage extends StorageInterface {
    constructor() {
        super();
        // ローカル保存先ルート: local_data/gcs/
        this.localRoot = path.resolve(process.cwd(), 'local_data', 'gcs');
    }

    /**
     * 論理パスをローカルファイルパスに変換
     */
    _toLocalPath(logicalPath) {
        // "GCS/..." などのプレフィックスがもしあれば、ここで調整可能
        // 基本的には logicalPath をそのままファイルパスとして扱う
        return path.join(this.localRoot, logicalPath);
    }

    /**
     * JSON読み込み
     */
    async readJSON(objectPath) {
        const filePath = this._toLocalPath(objectPath);
        logger.debug(`[LocalStorage] read: "${objectPath}" -> "${filePath}"`);

        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                logger.debug(`[LocalStorage] read: not found "${filePath}"`);
                return null;
            }
            logger.error(`[LocalStorage] read error: ${err.message}`);
            throw err;
        }
    }

    /**
     * JSON保存
     */
    async saveJSON(objectPath, data) {
        const filePath = this._toLocalPath(objectPath);
        const jsonStr = JSON.stringify(data ?? {}, null, 2);
        
        logger.debug(`[LocalStorage] save: "${objectPath}" -> "${filePath}"`);

        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, jsonStr, 'utf8');
        } catch (err) {
            logger.error(`[LocalStorage] save error: ${err.message}`);
            throw err;
        }
    }
}

module.exports = LocalStorage;
