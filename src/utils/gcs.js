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

// ====================================================
// 公開 API
// ====================================================
module.exports = {
  initializeGCS,
  isLocalMode: () => isLocalMode,
  readJSON,
  saveJSON,
  exists,
  writeFile,
  readFile,
};
