// src/utils/gcs.js
// ----------------------------------------------------
// GCS / ローカル兼用のストレージヘルパー
//   - 論理パス:  常に "GCS/ギルドID/..." を想定
//   - ローカル: local_data/gcs/ギルドID/... に保存
//   - GCS有効:  bucket("...").file("GCS/ギルドID/...") に保存
// ----------------------------------------------------

const fs = require('fs/promises');
const path = require('path');
const logger = require('./logger');
const { Storage } = require('@google-cloud/storage'); // eslint-disable-line no-unused-vars

const USE_GCS =
  process.env.USE_GCS === 'true' || process.env.GCS_ENABLED === 'true';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

// ローカル保存先ルート: local_data/gcs/
const LOCAL_GCS_ROOT = path.resolve(process.cwd(), 'local_data', 'gcs');

// USE_GCS が const だと再代入できないため let に変更
let useGcsMode = USE_GCS;
let storage = null; // eslint-disable-line no-unused-vars
let bucket = null; // eslint-disable-line no-unused-vars

if (useGcsMode) {
  if (!GCS_BUCKET_NAME) {
    logger.warn(
      '[gcs.js] USE_GCS=true ですが GCS_BUCKET_NAME が未設定のため、ローカルモードにフォールバックします。',
    );
    useGcsMode = false; // GCS を無効化
  } else {
    storage = new Storage();
    bucket = storage.bucket(GCS_BUCKET_NAME);
  }
}

if (useGcsMode) {
  logger.info(
    `[gcs.js] GCS モード有効: bucket="${GCS_BUCKET_NAME}"`,
  );
}

// 論理パスを正規化（「GCS/〜」前提だが一応揃えておく）
function normalizeObjectPath(objectPath) {
  let p = String(objectPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!p.startsWith('GCS/')) {
    p = `GCS/${p}`;
  }
  return p;
}

// 論理パス -> ローカル実パス
//   GCS/1381.../xxx.json -> local_data/gcs/1381.../xxx.json
function toLocalPath(objectPath) {
  const logicalPath = normalizeObjectPath(objectPath);
  const stripped = logicalPath.startsWith('GCS/')
    ? logicalPath.slice('GCS/'.length)
    : logicalPath;
  const filePath = path.join(LOCAL_GCS_ROOT, stripped);
  return { logicalPath, filePath };
}

// JSON を読み込み
async function readJSON(objectPath) {
  const { logicalPath, filePath } = toLocalPath(objectPath);

  if (useGcsMode && bucket) {
    logger.debug(
      `[gcs.js] readJSON (gcs): bucket="${GCS_BUCKET_NAME}", object="${logicalPath}"`,
    );
    const file = bucket.file(logicalPath);
    try {
      const [buf] = await file.download();
      if (!buf || !buf.length) return null;
      return JSON.parse(buf.toString('utf8'));
    } catch (err) {
      if (err.code === 404) {
        logger.debug(
          `[gcs.js] readJSON (gcs): not found "${logicalPath}"`
        );
        return null;
      }
      logger.error('[gcs.js] readJSON (gcs) エラー:', err);
      throw err;
    }
  } else {
    logger.debug(
      `[gcs.js] readJSON (local): logical="${logicalPath}" -> "${filePath}"`
    );
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.debug(
          `[gcs.js] readJSON (local): not found "${filePath}"`
        );
        return null;
      }
      logger.error('[gcs.js] readJSON (local) エラー:', err);
      throw err;
    }
  }
}

// JSON を保存
async function saveJSON(objectPath, data) {
  const { logicalPath, filePath } = toLocalPath(objectPath);
  const json = JSON.stringify(data ?? {}, null, 2);

  if (useGcsMode && bucket) {
    logger.debug(
      `[gcs.js] saveJSON (gcs): bucket="${GCS_BUCKET_NAME}", object="${logicalPath}"`,
    );
    const file = bucket.file(logicalPath);
    try {
      await file.save(json, {
        resumable: false,
        contentType: 'application/json; charset=utf-8',
      });
    } catch (err) {
      logger.error('[gcs.js] saveJSON (gcs) エラー:', err);
      throw err;
    }
  } else {
    logger.debug(
      `[gcs.js] saveJSON (local): logical="${logicalPath}" -> "${filePath}"`
    );
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, json, 'utf8');
    } catch (err) {
      logger.error('[gcs.js] saveJSON (local) エラー:', err);
      throw err;
    }
  }
}

module.exports = {
  readJSON,
  saveJSON,
  USE_GCS,
  GCS_BUCKET_NAME,
};
