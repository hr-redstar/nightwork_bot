/**
 * src/handlers/kuzibiki/kuzibikiStorage.js
 * くじ引きの実行結果をGCSに保存する
 */
const { GcsFile } = require('../../utils/gcs/gcsFile');
const dayjs = require('dayjs');

/**
 * くじ引きの実行結果を日付ごとのJSONファイルに追記保存する
 * @param {string} guildId
 * @param {object} resultData - 保存する結果データ
 */
async function saveKujiResult(guildId, resultData) {
  const now = dayjs();
  const dateStr = now.format('YYYY-MM-DD');
  const filePath = `kuzibiki/${guildId}/${dateStr}.json`;

  const file = new GcsFile(filePath);

  // 既存のデータを読み込む
  const existingData = await file.readJson().catch(() => []);

  // 新しい結果を追加
  const newData = [
    ...existingData,
    { timestamp: now.toISOString(), ...resultData },
  ];

  // ファイルに保存
  await file.saveJson(newData);
}

module.exports = { saveKujiResult };