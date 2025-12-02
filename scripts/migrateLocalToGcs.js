// scripts/migrateLocalToGcs.js
// ----------------------------------------------------
// local_data/gcs 以下のファイルを、GCS バケットへ一括移行する
//   - 既存ファイルがあっても上書きアップロード
//   - object 名は常に "GCS/〜" でアップロード
//     例) local_data/gcs/1381/... -> GCS/1381/...
// ----------------------------------------------------

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { Storage } = require('@google-cloud/storage');

const ROOT = process.cwd();
const LOCAL_GCS_ROOT = path.join(ROOT, 'local_data', 'gcs');

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
if (!GCS_BUCKET_NAME) {
  console.error('GCS_BUCKET_NAME が .env に設定されていません');
  process.exit(1);
}

const storage = new Storage();
const bucket = storage.bucket(GCS_BUCKET_NAME);

async function walkDir(dir, fileList = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, fileList);
    } else if (entry.isFile()) {
      fileList.push(full);
    }
  }
  return fileList;
}

async function main() {
  if (!fs.existsSync(LOCAL_GCS_ROOT)) {
    console.error(`ローカルの gcs ディレクトリが見つかりません: ${LOCAL_GCS_ROOT}`);
    process.exit(1);
  }

  console.log('ローカル → GCS 移行開始');
  console.log(`  local root: ${LOCAL_GCS_ROOT}`);
  console.log(`  bucket    : ${GCS_BUCKET_NAME}`);

  const files = await walkDir(LOCAL_GCS_ROOT);
  console.log(`アップロード対象ファイル数: ${files.length} 件`);

  let ok = 0;
  let ng = 0;

  for (const localPath of files) {
    // local_data/gcs/ からの相対パス (例: 1381/.../config.json)
    const rel = path.relative(LOCAL_GCS_ROOT, localPath).replace(/\\/g, '/');
    const gcsObjectName = `GCS/${rel}`; // 例: GCS/1381/.../config.json

    process.stdout.write(`→ ${gcsObjectName} ... `);

    try {
      await bucket.upload(localPath, {
        destination: gcsObjectName,
        resumable: false,
      });
      console.log('OK');
      ok++;
    } catch (err) {
      console.log('NG');
      console.error('  エラー:', err.message);
      ng++;
    }
  }

  console.log('----------------------------------------');
  console.log(`アップロード完了: OK=${ok}, NG=${ng}`);
  console.log('※ NG がある場合はログを確認してください。');
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});