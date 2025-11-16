// src/handlers/keihi/経費申請/keihiSaveHandler.js
const fs = require('fs').promises; // fs/promises を使用
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

    await fs.mkdir(dirPath, { recursive: true });

    let fileData = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      fileData = JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error; // ファイルが存在しない以外のエラーは再スロー
    }

    fileData.push(data);

    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf8');

    console.log(`💾 経費データを保存しました: ${filePath}`);
  } catch (err) {
    console.error('❌ 経費データ保存エラー:', err);
  }
}

module.exports = { saveKeihiDailyLocal };
