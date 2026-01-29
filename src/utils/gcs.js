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

// リトライ設定
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * 永続的エラー（リトライすべきでない）かチェック
 */
function isPermanentError(err) {
  // 認証エラー、バケット不存在、権限エラーなど
  if (err.code === 401 || err.code === 403 || err.code === 404) return true;
  if (err.message && err.message.includes('credentials')) return true;
  if (err.message && err.message.includes('not found')) return true;
  return false;
}

/**
 * 指数バックオフでリトライ
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // 永続的エラーは即座に失敗
      if (isPermanentError(err)) {
        throw err;
      }

      // 最後の試行で失敗したら例外をスロー
      if (attempt === maxRetries - 1) {
        throw err;
      }

      // 指数バックオフで待機
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      logger.warn(`[gcs.js] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

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
  logger.silly(
    `[gcs.js] GCS モード有効: bucket="${GCS_BUCKET_NAME}"`,
  );
}

// 論理パスを正規化
function normalizeObjectPath(objectPath) {
  return String(objectPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

// 論理パス -> ローカル実パス
function toLocalPath(objectPath) {
  const logicalPath = normalizeObjectPath(objectPath);
  // もし "GCS/" で始まっていたら剥がす (完全に過去との互換用)
  const stripped = logicalPath.replace(/^[Gg][Cc][Ss]\//, '');
  const filePath = path.join(LOCAL_GCS_ROOT, stripped);
  return { logicalPath, filePath };
}

// JSON を読み込み（リトライ付き）
async function readJSON(objectPath) {
  const { logicalPath, filePath } = toLocalPath(objectPath);

  if (useGcsMode && bucket) {
    logger.silly(
      `[gcs.js] readJSON (gcs): bucket="${GCS_BUCKET_NAME}", object="${logicalPath}"`,
    );
    const file = bucket.file(logicalPath);

    return await retryWithBackoff(async () => {
      try {
        const [buf] = await file.download();
        if (!buf || !buf.length) return null;
        return JSON.parse(buf.toString('utf8'));
      } catch (err) {
        if (err.code === 404) {
          logger.silly(
            `[gcs.js] readJSON (gcs): not found "${logicalPath}"`
          );
          return null;
        }
        throw err;
      }
    });
  } else {
    logger.silly(
      `[gcs.js] readJSON (local): logical="${logicalPath}" -> "${filePath}"`
    );
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return data ? JSON.parse(data) : null;
    } catch (err) {
      if (err.code === 'ENOENT') {
        logger.silly(
          `[gcs.js] readJSON (local): not found "${filePath}"`
        );
        return null;
      }
      logger.error('[gcs.js] readJSON (local) エラー:', err);
      throw err;
    }
  }
}

// JSON を保存（リトライ付き）
async function saveJSON(objectPath, data) {
  const { logicalPath, filePath } = toLocalPath(objectPath);
  const jsonStr = JSON.stringify(data ?? {}, null, 2);

  if (useGcsMode && bucket) {
    logger.silly(
      `[gcs.js] saveJSON (gcs): bucket="${GCS_BUCKET_NAME}", object="${logicalPath}"`,
    );
    const file = bucket.file(logicalPath);

    return await retryWithBackoff(async () => {
      await file.save(jsonStr, {
        contentType: 'application/json',
        resumable: false,
      });
      logger.silly(`[gcs.js] saveJSON (gcs): saved "${logicalPath}"`);
    });
  } else {
    logger.silly(
      `[gcs.js] saveJSON (local): logical="${logicalPath}" -> "${filePath}"`
    );
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, jsonStr, 'utf8');
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
  // 追加ヘルパー
  listFiles,
  downloadFileToBuffer,
  getPublicUrl,
  saveBuffer,
};

// ----------------------------------------------------
// 追加ヘルパー: listFiles / downloadFileToBuffer / getPublicUrl
// ----------------------------------------------------

async function listFiles(prefix) {
  const normalized = normalizeObjectPath(prefix);

  if (useGcsMode && bucket) {
    const [files] = await bucket.getFiles({ prefix: normalized });
    return files.map((f) => f.name);
  }

  // ローカル: prefix 配下のファイルを再帰取得
  const { filePath, logicalPath } = toLocalPath(normalized);
  const dir = logicalPath.startsWith('GCS/') ? logicalPath.slice('GCS/'.length) : logicalPath;
  const baseDir = path.join(LOCAL_GCS_ROOT, dir);

  async function walk(dirPath, logicalPrefix) {
    let results = [];
    let dirents;
    try {
      dirents = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    for (const d of dirents) {
      const fullPath = path.join(dirPath, d.name);
      const logical = `${logicalPrefix}/${d.name}`.replace(/\\/g, '/');
      if (d.isDirectory()) {
        const sub = await walk(fullPath, logical);
        results = results.concat(sub);
      } else {
        results.push(`GCS/${logical}`);
      }
    }
    return results;
  }

  const logicalPrefix = normalized.replace(/^GCS\//, '');
  return walk(baseDir, logicalPrefix);
}

async function downloadFileToBuffer(objectPath) {
  const normalized = normalizeObjectPath(objectPath);

  if (useGcsMode && bucket) {
    const file = bucket.file(normalized);
    const [buf] = await file.download();
    return buf;
  }

  const { filePath } = toLocalPath(normalized);
  return fs.readFile(filePath);
}

function getPublicUrl(objectPath) {
  const normalized = normalizeObjectPath(objectPath);
  if (useGcsMode && GCS_BUCKET_NAME) {
    return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${normalized}`;
  }
  return null;
}

// バッファを保存（CSV など汎用）
async function saveBuffer(objectPath, buffer) {
  const normalized = normalizeObjectPath(objectPath);
  const { logicalPath, filePath } = toLocalPath(normalized);

  if (useGcsMode && bucket) {
    const file = bucket.file(logicalPath);
    await file.save(buffer, { resumable: false });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}
