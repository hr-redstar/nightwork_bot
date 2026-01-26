/**
 * src/utils/storage/StorageFactory.js
 * ストレージインスタンスの生成を管理するファクトリ
 */

const GcsStorage = require('./GcsStorage');
const LocalStorage = require('./LocalStorage');
const logger = require('../logger');

class StorageFactory {
    constructor() {
        this.instance = null;
    }

    /**
     * ストレージインスタンスを取得 (Singleton)
     * 環境変数 USE_GCS / GCS_ENABLED と GCS_BUCKET_NAME に基づいて決定
     */
    getInstance() {
        if (this.instance) {
            return this.instance;
        }

        const useGcs = process.env.USE_GCS === 'true' || process.env.GCS_ENABLED === 'true';
        const bucketName = process.env.GCS_BUCKET_NAME;

        if (useGcs && bucketName) {
            try {
                this.instance = new GcsStorage();
                logger.info('[StorageFactory] Using GcsStorage');
            } catch (err) {
                logger.error(`[StorageFactory] Failed to initialize GcsStorage: ${err.message}. Falling back to LocalStorage.`);
                this.instance = new LocalStorage();
            }
        } else {
            if (useGcs && !bucketName) {
                logger.warn('[StorageFactory] USE_GCS is true but GCS_BUCKET_NAME is missing. Falling back to LocalStorage.');
            }
            this.instance = new LocalStorage();
            logger.info('[StorageFactory] Using LocalStorage');
        }

        return this.instance;
    }
}

module.exports = new StorageFactory();
