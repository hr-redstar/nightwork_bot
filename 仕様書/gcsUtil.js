/**
 * src/utils/gcs/gcsUtil.js
 * GCS関連の汎用ユーティリティ
 */
const { storage } = require('./gcsClient');
const logger = require('../logger'); // パスは正しいので変更なし

/**
 * GCSバケット内の指定されたプレフィックスに一致するファイル一覧を取得する
 * @param {string} prefix - 検索するプレフィックス (例: 'uriage/guildId/storeName/')
 * @returns {Promise<import('@google-cloud/storage').File[]>}
 */
async function listGcsFiles(prefix) {
  const bucketName = process.env.GCS_BUCKET_NAME;
  const [files] = await storage.bucket(bucketName).getFiles({ prefix });
  return files;
}

module.exports = { listGcsFiles };