/**
 * src/utils/storage/GcsStorage.js
 * GCS (Google Cloud Storage) を使用したストレージ実装
 * (GCS専用 - ローカルフォールバック機能は削除)
 */

const { Storage } = require('@google-cloud/storage');
const StorageInterface = require('./StorageInterface');
const logger = require('../logger');
const settings = require('../../config/settings');
const { retryWithBackoff } = require('../asyncUtils');

// リトライ設定
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

class GcsStorage extends StorageInterface {
    constructor() {
        super();
        this.bucketName = settings.gcsBucketName;
        this.storage = null;
        this.bucket = null;
        this._init();
    }

    _init() {
        if (!this.bucketName) {
            throw new Error('[GcsStorage] GCS_BUCKET_NAME is required for GcsStorage.');
        }

        try {
            this.storage = new Storage();
            this.bucket = this.storage.bucket(this.bucketName);
            logger.info(`[GcsStorage] Initialized with bucket: ${this.bucketName}`);
        } catch (err) {
            logger.error('[GcsStorage] Initialization failed:', err);
            throw err;
        }
    }

    /**
     * 永続的エラー（リトライすべきでない）かチェック
     */
    _isPermanentError(err) {
        if (err.code === 401 || err.code === 403 || err.code === 404) return true;
        if (err.message && err.message.includes('credentials')) return true;
        if (err.message && err.message.includes('not found')) return true;
        return false;
    }

    /**
     * 共通ユーティリティを使用してリトライ
     */
    async _executeWithRetry(fn) {
        return retryWithBackoff(async () => {
            try {
                return await fn();
            } catch (err) {
                // 永続的エラーの場合はリトライせずに即時スロー
                if (this._isPermanentError(err)) throw err;
                throw err;
            }
        }, MAX_RETRIES, INITIAL_RETRY_DELAY_MS);
    }

    /**
     * JSON読み込み
     */
    async readJSON(objectPath) {
        logger.debug(`[GcsStorage] read: bucket="${this.bucketName}", object="${objectPath}"`);
        const file = this.bucket.file(objectPath);

        return await this._executeWithRetry(async () => {
            try {
                const [buf] = await file.download();
                if (!buf || !buf.length) return null;
                return JSON.parse(buf.toString('utf8'));
            } catch (err) {
                if (err.code === 404) {
                    logger.debug(`[GcsStorage] read: not found "${objectPath}"`);
                    return null;
                }
                throw err;
            }
        });
    }

    /**
     * JSON保存
     */
    async saveJSON(objectPath, data) {
        const jsonStr = JSON.stringify(data ?? {}, null, 2);
        logger.debug(`[GcsStorage] save: bucket="${this.bucketName}", object="${objectPath}"`);
        const file = this.bucket.file(objectPath);

        return await this._executeWithRetry(async () => {
            await file.save(jsonStr, {
                contentType: 'application/json',
                resumable: false,
            });
            logger.debug(`[GcsStorage] save: saved "${objectPath}"`);
        });
    }
}

module.exports = GcsStorage;
