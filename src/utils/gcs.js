// src/utils/gcs.js
// ----------------------------------------------------
// Google Cloud Storage / ローカル 保存クライアント
// ----------------------------------------------------

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let bucket = null;
let isLocalMode = false;
let localBasePath = path.join(process.cwd(), 'local_data', 'GCS');

const BUCKET_NAME = process.env.GCP_BUCKET_NAME;
const PUBLIC_BASE_URL =
  process.env.GCS_PUBLIC_BASE_URL || `https://storage.googleapis.com/${BUCKET_NAME}/`;

const ENABLE_GCS_DEBUG = process.env.GCS_DEBUG === '1';

// -------------------------------
// GCS 初期化
// -------------------------------
function initializeGCS() {
  const projectId = process.env.GCP_PROJECT_ID;
  const bucketName = process.env.GCP_BUCKET_NAME;
  const keyFilename = process.env.GCP_SERVICE_KEY;

  if (!projectId || !bucketName || !keyFilename) {
    logger.info('💾 ローカル保存モード有効（GCS 無効 または 設定なし）');
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

    logger.info('☁️ GCS モード有効（クラウド保存を使用）');
  } catch (err) {
    logger.error('❌ GCS 初期化エラー → ローカル保存モードに切り替えます: ', err);
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
    if (ENABLE_GCS_DEBUG) {
      logger.info(
        `[gcs.js] [DEBUG] readJSON (ローカル): 読み込みパス "${localPath}"`
      );
    }
    if (!fs.existsSync(localPath)) return null;
    try {
      const raw = fs.readFileSync(localPath, 'utf-8');
      return JSON.parse(raw);
    } catch (parseError) {
      logger.error(
        `[gcs.js] [ERROR] JSON.parse に失敗しました: "${localPath}"`,
        parseError,
      );
      return null;
    }
  }

  try {
    if (ENABLE_GCS_DEBUG) {
      logger.info(
        `[gcs.js] [DEBUG] readJSON (GCS): 読み込みパス "gs://${BUCKET_NAME}/${filePath}"`
      );
    }
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
// テキスト保存（汎用）
// -------------------------------
/**
 * 任意テキストを GCS / ローカルに保存
 * @param {string} objectPath 保存先パス（バケット内 or ローカル）
 * @param {string} text       保存するテキスト
 * @param {string} [contentType] Content-Type（GCS用）
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
// 汎用バイナリ書き込み
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
// 汎用バイナリ読み込み
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
// ファイル / ディレクトリ一覧取得
// -------------------------------
/**
 * 指定されたパス配下のファイルまたはディレクトリ一覧を取得する
 *
 * @param {string} prefix - GCS のプレフィックス または ローカルのディレクトリ相当
 * @param {object} [options]
 * @param {boolean} [options.directoriesOnly=false] - true の場合はディレクトリ名のみ返す
 * @returns {Promise<string[]>} ファイルパス または ディレクトリ名の配列
 */
async function listFiles(prefix, options = {}) {
  const { directoriesOnly = false } = options;

  if (isLocalMode) {
    // prefix は 'GCS/...' の形式で渡される。localBasePath は '.../local_data'
    const localDirPath = path.join(localBasePath, prefix);
    logger.info(
      `[gcs.js] [DEBUG] listFiles(ローカル): 読み込みディレクトリ "${localDirPath}"`
    );

    if (!fs.existsSync(localDirPath)) return [];

    const dirents = fs.readdirSync(localDirPath, { withFileTypes: true });
    const results = [];

    for (const dirent of dirents) {
      if (directoriesOnly) {
        // ディレクトリのみ欲しい場合
        if (dirent.isDirectory()) {
          results.push(dirent.name);
        }
      } else {
        // ファイル一覧が欲しい場合
        // ここでは GCS モードと同じく「prefix からの相対パス」を返すイメージ
        // 例: listFiles('GCS/123/logs/') → '2025-11-25.json'
        if (dirent.isFile()) {
          results.push(path.join(prefix, dirent.name).replace(/\\/g, '/'));
        }
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

    if (directoriesOnly) {
      // "prefix/xxx/" → "xxx" のように末尾ディレクトリ名だけ返す
      return (apiResponse.prefixes || []).map((p) =>
        p.replace(prefix, '').replace(/\/$/, ''),
      );
    }

    // ファイルの場合は prefix を除いた相対パスを返す
    return files.map(f => f.name.substring(prefix.length));
  } catch (err) {
    logger.error('❌ listFiles 失敗:', prefix, err);
    return [];
  }
}

/**
 * GCS オブジェクトの公開 URL を組み立てる
 *
 * 例:
 *   PUBLIC_BASE_URL = https://storage.googleapis.com/my-bucket/
 *   objectPath      = GCS/12345/メッセージログ/67890/2025-11-29.json
 *   → https://storage.googleapis.com/my-bucket/GCS/12345/メッセージログ/67890/2025-11-29.json
 *
 * @param {string} objectPath GCS 内のオブジェクトパス
 * @returns {string} 公開 URL
 */
function buildPublicUrl(objectPath) {
  // 日本語パスも基本そのまま使えるが、念のため encodeURI でエンコード
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
