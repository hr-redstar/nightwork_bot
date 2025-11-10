/**
 * src/utils/fileUtils.js
 * ローカルファイル操作の共通ユーティリティ
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`⚠️ [fileUtils] 読込失敗: ${filePath}`, err);
    return null;
  }
}

function safeSaveJSON(filePath, data) {
  try {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.info(`💾 [local save] ${filePath}`);
  } catch (err) {
    logger.error(`❌ [fileUtils] 保存失敗: ${filePath}`, err);
  }
}

function safeSaveFile(filePath, data) {
  try {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, data, 'utf8');
    logger.info(`💾 [local save] ${filePath}`);
  } catch (err) {
    logger.error(`❌ [fileUtils] 保存失敗: ${filePath}`, err);
  }
}

function listLocalFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).map(file => path.join(dirPath, file));
}

module.exports = { safeReadJSON, safeSaveJSON, safeSaveFile, listLocalFiles };