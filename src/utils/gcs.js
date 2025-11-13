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

// 環境変数による切り替え
const USE_GCS = process.env.USE_GCS === 'true';
const LOCAL_BASE_PATH = path.join(__dirname, '../../local_data');

let storage = null;

// GCS モードの初期化
if (USE_GCS) {
  try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './src/utils/config/gcsServiceAccount.json';
    storage = new Storage({ keyFilename: keyPath });
    logger.info('☁️ GCS モード有効');
  } catch (err) {
    logger.error('❌ GCS初期化失敗。ローカルモードに切り替えます。', err);
  }
} else {
  logger.info('💾 ローカル保存モード有効');
}

// 初回起動での local_data 自動生成
if (!USE_GCS) {
  fs.mkdirSync(LOCAL_BASE_PATH, { recursive: true });
  logger.info(`📁 ローカルデータパス: ${LOCAL_BASE_PATH}`);
}


/**
 * ファイル読み込み（テキスト）
 */
async function readFile(filePath) {
  if (!USE_GCS || !storage) {
    const localPath = path.join(LOCAL_BASE_PATH, filePath);
    if (!fs.existsSync(localPath)) return null;
    return fs.promises.readFile(localPath, 'utf8');
  }

  try {
    const bucketName = process.env.GCS_BUCKET;
    const [contents] = await storage.bucket(bucketName).file(filePath).download();
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
  if (!USE_GCS || !storage) {
    const localPath = path.join(LOCAL_BASE_PATH, filePath);
    await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
    await fs.promises.writeFile(localPath, data, 'utf8');
    logger.debug(`💾 ローカル保存: ${localPath}`);
    return;
  }

  try {
    const bucketName = process.env.GCS_BUCKET;
    await storage.bucket(bucketName).file(filePath).save(data);
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
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    logger.error(`⚠️ JSON parse error: ${filePath}`, err);
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
    logger.error(`⚠️ JSON write error: ${filePath}`, err);
  }
}

/**
 * ディレクトリ内のファイル一覧を取得
 */
async function listFiles(prefix) {
  if (!USE_GCS || !storage) {
    const localDir = path.join(LOCAL_BASE_PATH, prefix);
    if (!fs.existsSync(localDir)) return [];
    return fs.readdirSync(localDir);
  }

  try {
    const bucketName = process.env.GCS_BUCKET;
    const [files] = await storage.bucket(bucketName).getFiles({ prefix });
    return files.map((f) => f.name);
  } catch (err) {
    logger.error(`❌ listFiles failed: ${prefix}`, err);
    return [];
  }
}

module.exports = {
  USE_GCS,
  readFile,
  writeFile,
  readJson,
  writeJson,
  // 他のモジュールとの互換性のためのエイリアス
  readJSON: readJson,
  saveJSON: writeJson,
  listFiles,
};
