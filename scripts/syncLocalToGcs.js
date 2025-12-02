// scripts/syncLocalToGcs.js
// ----------------------------------------------------
// ローカルの `local_data/GCS` ディレクトリの内容を
// GCSバケットに同期（アップロード）するスクリプト
//
// 使い方:
//   node scripts/syncLocalToGcs.js
//
// 事前準備:
//   - .env ファイルにGCSの本番環境用設定を記述しておく
//   - GCS_ENABLED=true または未設定であること
// ----------------------------------------------------

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// .env ファイルを読み込む
dotenv.config();

// gcs.js と logger.js をインポート
// ※ gcs.js はこの時点で初期化され、.env の内容に基づいてモードが決定される
const gcs = require('../src/utils/gcs');
const logger = require('../src/utils/logger');

const LOCAL_GCS_DIR = path.join(process.cwd(), 'local_data', 'GCS');

/**
 * 指定されたディレクトリを再帰的にスキャンし、ファイルパスのリストを返す
 * @param {string} dirPath - スキャンを開始するディレクトリ
 * @returns {string[]} ファイルパスの配列
 */
function- readdirRecursive(dirPath) {
  const allPaths = [];
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      allPaths.push(...readdirRecursive(fullPath));
    } else {
      allPaths.push(fullPath);
    }
  }
  return allPaths;
}

async function main() {
  logger.info('ローカルデータ → GCS 同期スクリプトを開始します...');

  if (gcs.isLocalMode()) {
    logger.error('❌ GCSがローカルモードで初期化されています。');
    logger.error('.env ファイルで GCS_ENABLED=false などが設定されていないか確認してください。');
    return;
  }

  if (!fs.existsSync(LOCAL_GCS_DIR)) {
    logger.warn(`ローカルデータディレクトリが見つかりません: ${LOCAL_GCS_DIR}`);
    return;
  }

  const localFiles = readdirRecursive(LOCAL_GCS_DIR);
  logger.info(`検出されたファイル数: ${localFiles.length}`);

  for (const localFilePath of localFiles) {
    // ローカルパスからGCSのオブジェクトパスに変換
    // 例: .../local_data/GCS/123/config.json → 123/config.json
    const gcsObjectPath = path.relative(LOCAL_GCS_DIR, localFilePath).replace(/\\/g, '/');
    
    try {
      const content = fs.readFileSync(localFilePath);
      await gcs.writeFile(gcsObjectPath, content);
      logger.info(`  ✅ アップロード成功: ${gcsObjectPath}`);
    } catch (error) {
      logger.error(`  ❌ アップロード失敗: ${gcsObjectPath}`, error);
    }
  }

  logger.info('同期処理が完了しました。');
}

main().catch((err) => {
  logger.error('スクリプトの実行中に致命的なエラーが発生しました。', err);
});
