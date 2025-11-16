/**
 * utils/gcs.js
 *
 * 開発環境ではローカル保存（./local_data）
 * 本番環境では Google Cloud Storage を使用
 */

const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const logger = require('./logger');

// -------------------------------------------------------------
// ⚙️ 環境変数
// -------------------------------------------------------------
const USE_GCS = process.env.USE_GCS === 'true';
const GCS_BUCKET = process.env.GCS_BUCKET || process.env.GCS_BUCKET_NAME;
const LOCAL_BASE_PATH = path.join(__dirname, '../../local_data');

let storage = null;
let activeMode = 'local';

// -------------------------------------------------------------
// ☁️ GCS モード初期化
// -------------------------------------------------------------
if (USE_GCS && GCS_BUCKET) {
  try {
    const keyPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(__dirname, '../config/gcsServiceAccount.json');
    storage = new Storage({ keyFilename: keyPath });
    activeMode = 'gcs';
    logger.info(`☁️ GCS モード有効: バケット=${GCS_BUCKET}`);
  } catch (err) {
    activeMode = 'local';
    logger.error('❌ GCS初期化失敗。ローカルモードに切り替えます。', err);
  }
} else {
  logger.info('💾 ローカル保存モード有効');
}

// -------------------------------------------------------------
// 📁 ローカルディレクトリ生成
// -------------------------------------------------------------
if (activeMode === 'local') {
  try {
    fs.mkdirSync(LOCAL_BASE_PATH, { recursive: true });
    logger.info(`📁 ローカルデータパス: ${LOCAL_BASE_PATH}`);
  } catch (err) {
    logger.error('❌ ローカルデータパス作成失敗:', err);
  }
}

// -------------------------------------------------------------
// 🧩 共通ユーティリティ
// -------------------------------------------------------------

/**
 * ファイル読み込み（テキスト）
 */
async function readFile(filePath) {
  if (activeMode === 'local' || !storage) {
    const localPath = path.join(LOCAL_BASE_PATH, filePath);
    if (!fs.existsSync(localPath)) return null;
    return fs.promises.readFile(localPath, 'utf8');
  }

  try {
    const [contents] = await storage.bucket(GCS_BUCKET).file(filePath).download();
    return contents.toString('utf8');
  } catch (err) {
    logger.error(`❌ Read file failed: ${filePath}`, err);
    return null;
  }
}

/**
 * ファイル保存（テキスト）
 */
async function writeFile(filePath, data) {
  if (activeMode === 'local' || !storage) {
    const localPath = path.join(LOCAL_BASE_PATH, filePath);
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await fs.promises.writeFile(localPath, data, 'utf8');
    logger.debug(`💾 ローカル保存: ${localPath}`);
    return;
  }

  try {
    await storage.bucket(GCS_BUCKET).file(filePath).save(data);
    logger.debug(`☁️ GCS保存完了: ${filePath}`);
  } catch (err) {
    logger.error(`❌ Write file failed: ${filePath}`, err);
  }
}

/**
 * JSON読み込み
 */
async function readJson(filePath) {
  try {
    const content = await readFile(filePath);
    if (!content || content.trim() === '') {
      if (content !== null) logger.warn(`[gcs] 空のJSONファイル: ${filePath}`);
      return null;
    }
    return JSON.parse(content);
  } catch (err) {
    logger.error(`⚠️ JSONパースエラー: ${filePath}`, err);
    return null;
  }
}

/**
 * JSON保存
 */
async function writeJson(filePath, data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    await writeFile(filePath, jsonStr);
  } catch (err) {
    logger.error(`⚠️ JSON書き込みエラー: ${filePath}`, err);
  }
}

/**
 * ディレクトリ内のファイル一覧を取得
 */
async function listFiles(prefix = '') {
  if (activeMode === 'local' || !storage) {
    const localDir = path.join(LOCAL_BASE_PATH, prefix);
    if (!fs.existsSync(localDir)) return [];
    return fs.readdirSync(localDir);
  }

  try {
    const [files] = await storage.bucket(GCS_BUCKET).getFiles({ prefix });
    return files.map((f) => f.name);
  } catch (err) {
    logger.error(`❌ listFiles failed: ${prefix}`, err);
    return [];
  }
}

async function deleteFile(filePath) {
  if (activeMode === 'local' || !storage) {
    const localPath = path.join(LOCAL_BASE_PATH, filePath);
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
      logger.debug(`🗑️ ローカル削除: ${filePath}`);
    }
    return;
  }

  try {
    await storage.bucket(GCS_BUCKET).file(filePath).delete();
    logger.debug(`🗑️ GCS削除完了: ${filePath}`);
  } catch (err) {
    logger.error(`❌ Delete file failed: ${filePath}`, err);
  }
}

// -------------------------------------------------------------
// 🧾 エクスポート
// -------------------------------------------------------------
module.exports = {
  readFile,
  writeFile,
  readJson,
  writeJson,
  // 他のモジュールとの互換性のためのエイリアス
  readJSON: readJson,
  saveJSON: writeJson,
  listFiles,
  deleteFile,
};
