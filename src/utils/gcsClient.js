// src/utils/gcsClient.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage = new Storage({
  keyFilename: path.join(__dirname, '../../gcs-key.json'),
});
const BUCKET_NAME = 'your-bucket-name';

/**
 * GCSにファイルをアップロード
 */
async function uploadToGCS(filePath, destination) {
  await storage.bucket(BUCKET_NAME).upload(filePath, {
    destination,
    gzip: true,
  });
  return `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
}

/**
 * GCSからファイルをダウンロード
 */
async function downloadFromGCS(destination, localPath) {
  await storage.bucket(BUCKET_NAME).file(destination).download({ destination: localPath });
  return localPath;
}

module.exports = { uploadToGCS, downloadFromGCS };
