/**
 * src/handlers/uriage/uriageCsv.js
 * 売上報告のCSV生成・保存を処理
 */
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
const { safeSaveFile, listLocalFiles } = require('../../utils/fileUtils');
dayjs.extend(quarterOfYear);

const baseDir = path.join(__dirname, '../../../local_data/GCS');

/**
 * 売上報告データをCSVとしてGCSに保存する
 * @param {string} guildId
 * @param {string} storeName
 * @param {object} reportData - Embedから抽出したレポートデータ
 * @returns {Promise<string>} 保存したGCSファイルのパス
 */
function saveReportToCsv(guildId, storeName, reportData) {
  const { date, totalSales, cash, card, expenses, balance, submitter, approver } = reportData;
  const dateForPath = dayjs(date, 'YYYY/MM/DD').format('YYYY-MM-DD');
  const filePath = path.join(baseDir, guildId, 'uriage', storeName, `売上報告_${dateForPath}.csv`);

  // CSVヘッダーとデータ行を作成
  const header = '日付,総売上,現金,カード,諸経費,残金,入力者,承認者\n';
  const dataRow = [
    date,
    totalSales,
    cash,
    card,
    expenses,
    balance,
    submitter,
    approver,
  ].join(',');

  safeSaveFile(filePath, header + dataRow);

  return filePath;
}

/**
 * 指定された店舗のGCS上のCSVファイルから、利用可能な期間のリストを生成する
 * @param {string} guildId
 * @param {string} storeName
 * @returns {Promise<{byDay: string[], byMonth: string[], byQuarter: string[]}>}
 */
function getAvailableCsvPeriods(guildId, storeName) {
  const dirPath = path.join(baseDir, guildId, 'uriage', storeName);
  const files = listLocalFiles(dirPath);

  const dates = new Set();
  const months = new Set();
  const quarters = new Set();

  for (const file of files) {
    const match = path.basename(file).match(/売上報告_(\d{4}-\d{2}-\d{2})\.csv$/);
    if (match) {
      const dateStr = match[1];
      const dateObj = dayjs(dateStr);
      if (dateObj.isValid()) {
        dates.add(dateObj.format('YYYY/MM/DD'));
        months.add(dateObj.format('YYYY年MM月'));
        quarters.add(`${dateObj.format('YYYY年')}-Q${dateObj.quarter()}`);
      }
    }
  }

  return {
    byDay: Array.from(dates).sort().reverse(),
    byMonth: Array.from(months).sort().reverse(),
    byQuarter: Array.from(quarters).sort().reverse(),
  };
}

/**
 * 指定された期間の売上報告CSVを結合して生成する
 * @param {string} guildId
 * @param {string} storeName
 * @param {string} periodType - 'day', 'month', 'quarter'
 * @param {string} periodValue - e.g., '2025/11/10', '2025年11月', '2025年-Q4'
 * @returns {Promise<{content: Buffer, filename: string} | null>}
 */
function generateCsvForPeriod(guildId, storeName, periodType, periodValue) {
  const dirPath = path.join(baseDir, guildId, 'uriage', storeName);
  const allFiles = listLocalFiles(dirPath);
  let targetFiles = [];
  let filename = `売上報告_${storeName}_${periodValue.replace(/\//g, '-')}.csv`;

  if (periodType === 'day') {
    const dateStr = dayjs(periodValue, 'YYYY/MM/DD').format('YYYY-MM-DD');
    targetFiles = allFiles.filter(f => path.basename(f).includes(`売上報告_${dateStr}.csv`));
  } else if (periodType === 'month') {
    const monthStr = dayjs(periodValue, 'YYYY年MM月').format('YYYY-MM');
    targetFiles = allFiles.filter(f => path.basename(f).includes(`売上報告_${monthStr}`));
  } else if (periodType === 'quarter') {
    const [year, quarterNum] = periodValue.split('-Q');
    const yearStr = year.replace('年', '');
    const startMonth = (parseInt(quarterNum, 10) - 1) * 3;
    const startDate = dayjs(`${yearStr}-01-01`).month(startMonth).startOf('month');
    const endDate = startDate.add(2, 'month').endOf('month');
    targetFiles = allFiles.filter(f => {
      const match = path.basename(f).match(/売上報告_(\d{4}-\d{2}-\d{2})\.csv$/);
      if (!match) return false;
      const fileDate = dayjs(match[1]);
      return fileDate.isAfter(startDate.subtract(1, 'day')) && fileDate.isBefore(endDate.add(1, 'day'));
    });
  }

  if (targetFiles.length === 0) return null;

  const header = '日付,総売上,現金,カード,諸経費,残金,入力者,承認者\n';
  let combinedData = '';

  for (const filePath of targetFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    // ヘッダー行を除いて結合
    combinedData += content.toString().split('\n').slice(1).join('\n');
  }

  return {
    content: Buffer.from(header + combinedData),
    filename: filename,
  };
}

module.exports = { saveReportToCsv, getAvailableCsvPeriods, generateCsvForPeriod };