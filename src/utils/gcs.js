// src/utils/gcs.js
// ----------------------------------------------------
// Google Cloud Storage / ローカル 保存クライアント
// ----------------------------------------------------

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let bucket = null;
let isLocalMode = false;
let localBasePath = path.join(process.cwd(), 'local_data');

const BUCKET_NAME = process.env.GCP_BUCKET_NAME;
const PUBLIC_BASE_URL =
  process.env.GCS_PUBLIC_BASE_URL || `https://storage.googleapis.com/${BUCKET_NAME}/`;

// -------------------------------
// GCS 初期化
// -------------------------------
function initializeGCS() {
  const projectId = process.env.GCP_PROJECT_ID;
  const bucketName = process.env.GCP_BUCKET_NAME;
  const keyFilename = process.env.GCP_SERVICE_KEY;

  if (!projectId || !bucketName || !keyFilename) {
    logger.info('💾 ローカル保存モード有効（GCS無効 or 設定なし）');
    isLocalMode = true;
    return;
  }

  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({
      projectId,
      keyFilename,
    });

    bucket = storage.bucket(bucketName);
    isLocalMode = false;

    logger.info('☁️ GCS モード有効');
  } catch (err) {
    logger.error('❌ GCS 初期化エラー → ローカルモードに切替: ', err);
    isLocalMode = true;
  }
}

// ====================================================
// GCS / ローカル共通 I/O
// ====================================================

// -------------------------------
// JSON 読み込み
// -------------------------------
async function readJSON(filePath) {
  if (isLocalMode) {
    const localPath = path.join(localBasePath, filePath);
    if (!fs.existsSync(localPath)) return null;
    const raw = fs.readFileSync(localPath, 'utf-8');
    return JSON.parse(raw);
  }

  try {
    const file = bucket.file(filePath);
    const exists = await file.exists();
    if (!exists[0]) return null;

    const [contents] = await file.download();
    return JSON.parse(contents.toString());
  } catch (err) {
    logger.error('❌ readJSON 失敗:', filePath, err);
    return null;
  }
}

// -------------------------------
// JSON 保存
// -------------------------------
async function saveJSON(filePath, data) {
  const jsonString = JSON.stringify(data, null, 2);

  if (isLocalMode) {
    const localPath = path.join(localBasePath, filePath);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(localPath, jsonString);
    return true;
  }

  try {
    await bucket.file(filePath).save(jsonString, {
      contentType: 'application/json',
    });
    return true;
  } catch (err) {
    logger.error('❌ saveJSON 失敗:', filePath, err);
    return false;
  }
}

// -------------------------------
// テキスト保存
// -------------------------------
/**
 * 任意テキストを GCS / ローカルに保存
 * @param {string} objectPath
 * @param {string} text
 * @param {string} [contentType]
 */
async function saveText(objectPath, text, contentType = 'text/plain; charset=utf-8') {
  if (isLocalMode) {
    const localPath = path.join(localBasePath, objectPath);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(localPath, text);
    return true;
  }

  try {
    await bucket.file(objectPath).save(text, { contentType });
    return true;
  } catch (err) {
    logger.error('❌ saveText 失敗:', objectPath, err);
    return false;
  }
}

// -------------------------------
// ファイル存在チェック
// -------------------------------
async function exists(filePath) {
  if (isLocalMode) {
    const localPath = path.join(localBasePath, filePath);
    return fs.existsSync(localPath);
  }

  try {
    const [exists] = await bucket.file(filePath).exists();
    return exists;
  } catch {
    return false;
  }
}

// -------------------------------
// 汎用書き込み
// -------------------------------
async function writeFile(filePath, buffer) {
  if (isLocalMode) {
    const localPath = path.join(localBasePath, filePath);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(localPath, buffer);
    return;
  }

  await bucket.file(filePath).save(buffer);
}

// -------------------------------
// 汎用読み込み
// -------------------------------
async function readFile(filePath) {
  if (isLocalMode) {
    const localPath = path.join(localBasePath, filePath);
    if (!fs.existsSync(localPath)) return null;
    return fs.readFileSync(localPath);
  }

  const [contents] = await bucket.file(filePath).download();
  return contents;
}

// -------------------------------
// ファイル/ディレクトリ一覧取得
// -------------------------------
/**
 * 指定されたパスのファイルまたはディレクトリの一覧を取得する
 * @param {string} prefix - GCSのプレフィックスまたはローカルのディレクトリパス
 * @param {object} [options] - オプション
 * @param {boolean} [options.directoriesOnly=false] - ディレクトリのみを取得するかどうか
 * @returns {Promise<string[]>} ファイルパスまたはディレクトリ名の配列
 */
async function listFiles(prefix, options = {}) {
  const { directoriesOnly = false } = options;

  if (isLocalMode) {
    const localDirPath = path.join(localBasePath, prefix);
    if (!fs.existsSync(localDirPath)) return [];

    const dirents = fs.readdirSync(localDirPath, { withFileTypes: true });
    const results = [];

    for (const dirent of dirents) {
      if (directoriesOnly && dirent.isDirectory()) {
        results.push(dirent.name);
      } else if (!directoriesOnly && dirent.isFile()) {
        // GCSのパス形式に合わせて返す
        results.push(path.join(prefix, dirent.name).replace(/\\/g, '/'));
      }
    }
    return results;
  }

  // GCS Mode
  try {
    const [files, , apiResponse] = await bucket.getFiles({
      prefix: prefix,
      delimiter: directoriesOnly ? '/' : undefined,
    });

    return directoriesOnly ? (apiResponse.prefixes || []) : files.map(f => f.name);
  } catch (err) {
    logger.error('❌ listFiles 失敗:', prefix, err);
    return [];
  }
}

/**
 * GCS オブジェクトの公開 URL を組み立てる
 *   例) PUBLIC_BASE_URL=https://storage.googleapis.com/my-bucket/
 *       objectPath=GCS/12345/メッセージログ/67890/2025-11-29.json
 *       → https://storage.googleapis.com/my-bucket/GCS/12345/メッセージログ/67890/2025-11-29.json
 * @param {string} objectPath GCS 内のオブジェクトパス
 */
function buildPublicUrl(objectPath) {
  // 日本語パスもそのまま使えるが、気になる場合は encodeURI でエンコード
  return `${PUBLIC_BASE_URL}${encodeURI(objectPath)}`;
}

// ====================================================
// 公開 API
// ====================================================
module.exports = {
  initializeGCS,
  isLocalMode: () => isLocalMode,
  readJSON,
  saveJSON,
  saveText,
  exists,
  writeFile,
  readFile,
  listFiles,
  buildPublicUrl,
};
