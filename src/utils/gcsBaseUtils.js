// src/utils/gcsBaseUtils.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

async function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function saveJson(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = { loadJson, saveJson, ensureDir };
