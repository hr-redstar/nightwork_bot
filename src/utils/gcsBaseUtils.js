// src/utils/gcsBaseUtils.js
const fs = require('fs');
const path = require('path');

async function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function saveJson(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = { loadJson, saveJson, ensureDir };
