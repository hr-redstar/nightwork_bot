// src/utils/uriage/gcsUriageManager.js
// ----------------------------------------------------
// 売上データの GCS 読み書きユーティリティ
//   - 日別 / 月別 / 年別 / 四半期 JSON & CSV
//   - 売上報告の蓄積・CSV出力用
// ----------------------------------------------------

const path = require('path');
const { toDateKey, buildDailyPath } = require('./dailyPath');
const { appendDailyRecord } = require('./dailyStore');
const {
  readJSON,
  saveJSON,
  listFiles,
  downloadFileToBuffer,
  saveBuffer,
  getPublicUrl,
} = require('../gcs');

const DAILY_LABEL_RE = /^\d{4}-\d{2}-\d{2}$/; // 2025-12-06
const DAILY_COMPACT_RE = /^\d{8}$/;           // 20251206
const MONTHLY_LABEL_RE = /^\d{4}-\d{2}$/;     // 2025-12
const MONTHLY_LEGACY_RE = /^\d{6}$/;           // 202512
const YEARLY_LABEL_RE = /^\d{4}$/;             // 2025
const QUARTER_LABEL_RE = /^\d{4}_\d{2}~\d{2}$/; // 2025_01~03

// ==============================
// JSON パス生成
// ==============================
function getDailyJsonPath(guildId, storeName, dateLabel) {
  const dateKey = toDateKey(dateLabel);
  return buildDailyPath({ guildId, type: 'uriage', storeName, dateKey });
}

function getMonthlyJsonPath(guildId, storeName, monthLabel) {
  const y = monthLabel.slice(0, 4);
  const m = monthLabel.slice(5, 7);
  return path.join('GCS', guildId, 'uriage', storeName, y, m, `${monthLabel}.json`);
}

function getYearlyJsonPath(guildId, storeName, yearLabel) {
  return path.join('GCS', guildId, 'uriage', storeName, yearLabel, `${yearLabel}.json`);
}

// ==============================
// CSV パス生成
// ==============================
function getDailyCsvPath(guildId, storeName, dateLabel) {
  const compact = toDateKey(dateLabel);
  const y = compact.slice(0, 4);
  const m = compact.slice(4, 6);
  const d = compact.slice(6, 8);
  return path.join('GCS', guildId, 'uriage', storeName, y, m, d, `${compact}.csv`);
}

function getMonthlyCsvPath(guildId, storeName, monthLabel) {
  const y = monthLabel.slice(0, 4);
  const m = monthLabel.slice(5, 7);
  return path.join('GCS', guildId, 'uriage', storeName, y, m, `${monthLabel}.csv`);
}

function getYearlyCsvPath(guildId, storeName, yearLabel) {
  return path.join('GCS', guildId, 'uriage', storeName, yearLabel, `${yearLabel}.csv`);
}

function getQuarterCsvPath(guildId, storeName, quarterLabel) {
  return path.join('GCS', guildId, 'uriage', storeName, '四半期', `${quarterLabel}.csv`);
}

/**
 * 売上レコードを日別JSONに追加
 * record 例:
 * {
 *   id,
 *   date,
 *   total,
 *   cash,
 *   kake,
 *   expense,
 *   remain,
 *   status,
 *   requesterName,
 *   requestAtText,
 *   modifierName,
 *   modifierAtText,
 *   approvedByName,
 *   approvedAtText,
 * }
 */
async function appendUriageRecord(guildId, storeName, date, record) {
  return appendDailyRecord({
    guildId,
    type: 'uriage',
    storeName,
    date,
    record,
  });
}

// ==============================
// JSON 読み書き
// ==============================
async function safeLoadJson(logicalPath, defaultValue) {
  try {
    const data = await readJSON(logicalPath);
    return data ?? defaultValue;
  } catch (err) {
    if (err && err.code === 'ENOENT') return defaultValue;
    throw err;
  }
}

async function loadUriageDailyData(guildId, storeName, dateLabel) {
  const p = getDailyJsonPath(guildId, storeName, dateLabel);
  return (await safeLoadJson(p, {})) || {};
}

async function saveUriageDailyData(guildId, storeName, dateLabel, data) {
  const p = getDailyJsonPath(guildId, storeName, dateLabel);
  await saveJSON(p, data ?? {});
  return data;
}

async function loadUriageMonthlyData(guildId, storeName, monthLabel) {
  const p = getMonthlyJsonPath(guildId, storeName, monthLabel);
  const d = await safeLoadJson(p, null);
  if (d) return d;

  // 旧形式 YYYYMM.json 対応
  const legacyPath = path.join(
    'GCS',
    guildId,
    'uriage',
    storeName,
    monthLabel.slice(0, 4),
    monthLabel.slice(5, 7),
    `${monthLabel.replace('-', '')}.json`,
  );
  return (await safeLoadJson(legacyPath, {})) || {};
}

async function saveUriageMonthlyData(guildId, storeName, monthLabel, data) {
  const p = getMonthlyJsonPath(guildId, storeName, monthLabel);
  await saveJSON(p, data ?? {});
  return data;
}

async function loadUriageYearlyData(guildId, storeName, yearLabel) {
  const p = getYearlyJsonPath(guildId, storeName, yearLabel);
  return safeLoadJson(p, {});
}

async function saveUriageYearlyData(guildId, storeName, yearLabel, data) {
  const p = getYearlyJsonPath(guildId, storeName, yearLabel);
  await saveJSON(p, data ?? {});
  return data;
}

// ==============================
// ターゲット一覧取得
// ==============================
function normalizeDailyLabel(name) {
  if (DAILY_LABEL_RE.test(name)) return name;
  if (DAILY_COMPACT_RE.test(name)) {
    return `${name.slice(0, 4)}-${name.slice(4, 6)}-${name.slice(6, 8)}`;
  }
  return null;
}

function normalizeMonthlyLabel(name) {
  if (MONTHLY_LABEL_RE.test(name)) return name;
  if (MONTHLY_LEGACY_RE.test(name)) {
    return `${name.slice(0, 4)}-${name.slice(4, 6)}`;
  }
  return null;
}

async function listUriageJsonTargets(guildId, storeName, rangeType) {
  if (rangeType === 'quarter') {
    return listQuarterTargetsFromMonthlyJson(guildId, storeName);
  }

  const root = path.join('GCS', guildId, 'uriage', storeName);
  const files = await listFiles(root).catch(() => []);

  return (files || [])
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'))
    .map(label => {
      if (rangeType === 'daily') return normalizeDailyLabel(label);
      if (rangeType === 'monthly') return normalizeMonthlyLabel(label);
      return label;
    })
    .filter(Boolean)
    .sort((a, b) => (a < b ? 1 : -1));
}

async function listQuarterTargetsFromMonthlyJson(guildId, storeName) {
  const root = path.join('GCS', guildId, 'uriage', storeName);
  const files = await listFiles(root).catch(() => []);

  const monthlyLabels = (files || [])
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'))
    .map(normalizeMonthlyLabel)
    .filter(Boolean);

  const yearMonthMap = new Map();
  for (const label of monthlyLabels) {
    const year = label.slice(0, 4);
    const month = parseInt(label.slice(5, 7), 10);
    if (!yearMonthMap.has(year)) yearMonthMap.set(year, new Set());
    yearMonthMap.get(year).add(month);
  }

  const quarterLabels = [];
  const quarters = [
    [1, 3],
    [4, 6],
    [7, 9],
    [10, 12],
  ];

  for (const [year, months] of yearMonthMap.entries()) {
    for (const [s, e] of quarters) {
      for (let m = s; m <= e; m++) {
        if (months.has(m)) {
          quarterLabels.push(`${year}_${String(s).padStart(2, '0')}~${String(e).padStart(2, '0')}`);
          break;
        }
      }
    }
  }

  return quarterLabels.sort((a, b) => (a < b ? 1 : -1));
}

// ==============================
// CSV 生成
// ==============================
function extractRecords(jsonData) {
  if (!jsonData) return [];
  if (Array.isArray(jsonData)) return jsonData;
  if (Array.isArray(jsonData.records)) return jsonData.records;
  if (Array.isArray(jsonData.requests)) return jsonData.requests;
  if (typeof jsonData === 'object') {
    return Object.values(jsonData).filter(v => typeof v === 'object');
  }
  return [];
}

function normalizeRecordForCsv(rec) {
  if (!rec || typeof rec !== 'object') return {};

  const statusJa =
    rec.status === 'APPROVED' || rec.status === '承認' ? '承認' : '申請中';

  return {
    メッセージID: rec.id ?? '',
    ステータス: statusJa,
    日付: rec.date ?? '',
    総売り: rec.total ?? '',
    現金: rec.cash ?? '',
    掛け金: rec.kake ?? '',
    諸経費: rec.expense ?? '',
    残金: rec.remain ?? '',
    申請者名: rec.requesterName ?? '',
    申請時間: rec.requestAtText ?? '',
    修正者名: rec.modifierName ?? '',
    修正時間: rec.modifierAtText ?? '',
    承認者名: rec.approvedByName ?? '',
    承認時間: rec.approvedAtText ?? '',
  };
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (text.includes('"')) text = text.replace(/"/g, '""');
  if (/[,"\r\n]/.test(text)) text = `"${text}"`;
  return text;
}

function buildCsvHeaderKeys(records) {
  const set = new Set();
  for (const r of records) {
    Object.keys(r).forEach(k => set.add(k));
  }
  return Array.from(set);
}

function buildCsvRows(records, headers) {
  return records.map(r =>
    headers.map(h => escapeCsvCell(r[h])).join(','),
  );
}

async function buildUriageCsvForPeriod(guildId, storeName, rangeType, label) {
  let records = [];

  if (rangeType === 'quarter') {
    const months = getMonthlyLabelsForQuarter(label);
    for (const m of months) {
      try {
        const data = await readJSON(getMonthlyJsonPath(guildId, storeName, m));
        records.push(...extractRecords(data));
      } catch {}
    }
  } else {
    const jsonPath =
      rangeType === 'daily'
        ? getDailyJsonPath(guildId, storeName, label)
        : rangeType === 'monthly'
        ? getMonthlyJsonPath(guildId, storeName, label)
        : getYearlyJsonPath(guildId, storeName, label);

    const jsonData = await readJSON(jsonPath);
    records = extractRecords(jsonData);
  }

  records = records.map(normalizeRecordForCsv);

  const csvPath =
    rangeType === 'daily'
      ? getDailyCsvPath(guildId, storeName, label)
      : rangeType === 'monthly'
      ? getMonthlyCsvPath(guildId, storeName, label)
      : rangeType === 'yearly'
      ? getYearlyCsvPath(guildId, storeName, label)
      : getQuarterCsvPath(guildId, storeName, label);

  const headers = buildCsvHeaderKeys(records);
  const rows = buildCsvRows(records, headers);
  const csv = [headers.join(','), ...rows].join('\n');

  const buffer = Buffer.from(csv, 'utf8');
  await saveBuffer(csvPath, buffer);

  return {
    buffer,
    fileName: path.basename(csvPath),
    publicUrl: getPublicUrl(csvPath),
  };
}

function getMonthlyLabelsForQuarter(quarterLabel) {
  const [year, range] = quarterLabel.split('_');
  const [s, e] = range.split('~').map(v => parseInt(v, 10));
  const list = [];
  for (let m = s; m <= e; m++) {
    list.push(`${year}-${String(m).padStart(2, '0')}`);
  }
  return list;
}

// ==============================
// exports
// ==============================
module.exports = {
  appendUriageRecord,

  loadUriageDailyData,
  saveUriageDailyData,
  loadUriageMonthlyData,
  saveUriageMonthlyData,
  loadUriageYearlyData,
  saveUriageYearlyData,

  listUriageJsonTargets,
  buildUriageCsvForPeriod,

  getDailyJsonPath,
  getMonthlyJsonPath,
  getYearlyJsonPath,
  getDailyCsvPath,
  getMonthlyCsvPath,
  getYearlyCsvPath,
  getQuarterCsvPath,
};
