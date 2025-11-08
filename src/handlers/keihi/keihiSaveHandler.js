// src/handlers/keihi/keihiSaveHandler.js
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

/**
 * 日次経費データを保存（ローカルモード）
 * @param {string} guildId
 * @param {string} storeName
 * @param {object} data
 */
async function saveKeihiDailyLocal(guildId, storeName, data) {
  try {
    const date = dayjs().format('YYYYMMDD');
    const dirPath = path.resolve(
      __dirname,
      `../../../data/${guildId}/keihi/${storeName}/${dayjs().format('YYYY')}/${dayjs().format('MM')}/${dayjs().format('DD')}`
    );
    const filePath = path.join(dirPath, `${date}.json`);

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    let fileData = [];
    if (fs.existsSync(filePath)) {
      fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    fileData.push(data);

    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');

    console.log(`💾 経費データを保存しました: ${filePath}`);
  } catch (err) {
    console.error('❌ 経費データ保存エラー:', err);
  }
}

module.exports = { saveKeihiDailyLocal };
