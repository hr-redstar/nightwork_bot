// src/utils/syut/gcsSyut.js
const { readFile, writeFile } = require('../gcs');

/**
 * 今日の出退勤データをGCSから取得
 * @param {string} guildId
 * @param {string} storeName
 * @param {Date} date
 * @returns {Promise<Object>} 今日の出退勤データ
 */
async function getTodayAttendance(guildId, storeName, date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const filePath = `GCS/${guildId}/syut/${storeName}/${yyyy}/${mm}/${dateKey}.json`;

  const raw = await readFile(filePath);
  return raw ? JSON.parse(raw) : {};
}

/**
 * 出退勤データをGCSに保存
 * @param {string} guildId
 * @param {string} storeName
 * @param {string} dateKey YYYY-MM-DD形式
 * @param {Object} data 保存する出退勤データ
 */
async function saveAttendanceData(guildId, storeName, dateKey, data) {
  const [yyyy, mm] = dateKey.split('-');
  const filePath = `GCS/${guildId}/syut/${storeName}/${yyyy}/${mm}/${dateKey}.json`;
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  getTodayAttendance,
  saveAttendanceData,
};