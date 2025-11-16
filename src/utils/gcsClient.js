/**
 * src/utils/gcsClient.js
 * -------------------------------------
 * Google Cloud Storage クライアントの初期化
 * - USE_GCS / GCS_ENABLED / GCS_BUCKET_NAME に応じて動的切替
 * - 他モジュールが直接 GCS bucket を扱う場合に利用
 */

const path = require('path');
const { Storage } = require('@google-cloud/storage');
const logger = require('./logger');

let storage = null;
let bucket = null;

/**
 * GCS クライアント初期化
 * @returns {import('@google-cloud/storage').Bucket|null}
 */
function initGCS() {
  const { GCS_ENABLED, GCS_BUCKET_NAME, GOOGLE_APPLICATION_CREDENTIALS, USE_GCS } = process.env;

  const isEnabled =
    (USE_GCS === 'true') ||
    (GCS_ENABLED !== 'false' && !!GCS_BUCKET_NAME);

  if (!isEnabled) {
    logger.warn('☁️ GCS 機能は無効化されています。ローカルモードで動作します。');
    return null;
  }

  try {
    const keyPath = GOOGLE_APPLICATION_CREDENTIALS
      ? path.resolve(GOOGLE_APPLICATION_CREDENTIALS)
      : path.resolve('./src/utils/config/gcsServiceAccount.json');

    storage = new Storage({ keyFilename: keyPath });
    bucket = storage.bucket(GCS_BUCKET_NAME);

    logger.info(`☁️ GCS 初期化完了: バケット = ${GCS_BUCKET_NAME}`);
    return bucket;
  } catch (err) {
    logger.error('❌ GCS 初期化に失敗しました:', err);
    return null;
  }
}

/**
 * GCS Bucket インスタンスを取得
 */
function getBucket() {
  if (!bucket) return initGCS();
  return bucket;
}

/**
 * ストレージクライアントを直接取得
 */
function getStorage() {
  if (!storage) initGCS();
  return storage;
}

module.exports = {
  initGCS,
  getBucket,
  getStorage,
};