// src/utils/keihi/gcsKeihiManager.js
// ----------------------------------------------------
// 経費データの GCS 読み書きユーティリティ
//   - 日別 / 月別 / 年別 JSON & CSV
//   - 四半期 CSV（四半期フォルダ配下、月別JSONから集計）
//   - /設定経費 > 経費csv発行 で使用
// ----------------------------------------------------

const path = require('path');
const {
  readJSON,
  saveJSON,
  listFiles,
  downloadFileToBuffer,
  saveBuffer,
  getPublicUrl,
} = require('../gcs');

const DAILY_COMPACT_RE = /^\d{8}$/; // 20251206
const DAILY_LABEL_RE = /^\d{4}-\d{2}-\d{2}$/; // 2025-12-06
const MONTHLY_LABEL_RE = /^\d{4}-\d{2}$/; // 2025-12
const MONTHLY_LEGACY_RE = /^\d{6}$/; // 202512
const YEARLY_LABEL_RE = /^\d{4}$/; // 2025
const QUARTER_LABEL_RE = /^\d{4}_\d{2}~\d{2}$/; // 2025_01~03

// ==============================
// パスヘルパー（JSON）
// ==============================

function getDailyJsonPath(guildId, storeName, dateLabel) {
  const year = dateLabel.slice(0, 4);
  const month = dateLabel.slice(5, 7);
  const day = dateLabel.slice(8, 10);

  const compact = `${year}${month}${day}`;
  return path.join('GCS', guildId, 'keihi', storeName, year, month, day, `${compact}.json`);
}

function getMonthlyJsonPath(guildId, storeName, monthLabel) {
  const year = monthLabel.slice(0, 4);
  const month = monthLabel.slice(5, 7);

  return path.join('GCS', guildId, 'keihi', storeName, year, month, `${monthLabel}.json`);
}

function getYearlyJsonPath(guildId, storeName, yearLabel) {
  return path.join('GCS', guildId, 'keihi', storeName, yearLabel, `${yearLabel}.json`);
}

// 四半期は JSON を持たず、月別 JSON から集計する設計なので JSON パスは作らない

// ==============================
// パスヘルパー（CSV）
// ==============================

function getDailyCsvPath(guildId, storeName, dateLabel) {
  const year = dateLabel.slice(0, 4);
  const month = dateLabel.slice(5, 7);
  const day = dateLabel.slice(8, 10);

  const compact = `${year}${month}${day}`;
  return path.join('GCS', guildId, 'keihi', storeName, year, month, day, `${compact}.csv`);
}

function getMonthlyCsvPath(guildId, storeName, monthLabel) {
  const year = monthLabel.slice(0, 4);
  const month = monthLabel.slice(5, 7);

  return path.join('GCS', guildId, 'keihi', storeName, year, month, `${monthLabel}.csv`);
}

function getYearlyCsvPath(guildId, storeName, yearLabel) {
  return path.join('GCS', guildId, 'keihi', storeName, yearLabel, `${yearLabel}.csv`);
}

function getQuarterCsvPath(guildId, storeName, quarterLabel) {
  // quarterLabel: 'YYYY_01~03' など
  return path.join('GCS', guildId, 'keihi', storeName, '四半期', `${quarterLabel}.csv`);
}

// ==============================
// 既存用: 日 / 月 / 年 データ読書き
// ==============================

async function safeLoadJson(pathLogical, defaultValue) {
  try {
    const data = await readJSON(pathLogical);
    return data ?? defaultValue;
  } catch (err) {
    if (err && err.code === 'ENOENT') return defaultValue;
    throw err;
  }
}

async function loadKeihiDailyData(guildId, storeName, dateLabel) {
  const data = await readJsonWithLegacy(guildId, storeName, 'daily', dateLabel);
  return data ?? {};
}
async function saveKeihiDailyData(guildId, storeName, dateLabel, data) {
  const p = getDailyJsonPath(guildId, storeName, dateLabel);
  await saveJSON(p, data ?? {});
  return data;
}

async function loadKeihiMonthlyData(guildId, storeName, monthLabel) {
  const data = await readJsonWithLegacy(guildId, storeName, 'monthly', monthLabel);
  return data ?? {};
}
async function saveKeihiMonthlyData(guildId, storeName, monthLabel, data) {
  const p = getMonthlyJsonPath(guildId, storeName, monthLabel);
  await saveJSON(p, data ?? {});
  return data;
}

async function loadKeihiYearlyData(guildId, storeName, yearLabel) {
  const p = getYearlyJsonPath(guildId, storeName, yearLabel);
  return safeLoadJson(p, {});
}
async function saveKeihiYearlyData(guildId, storeName, yearLabel, data) {
  const p = getYearlyJsonPath(guildId, storeName, yearLabel);
  await saveJSON(p, data ?? {});
  return data;
}

// 互換ヘルパー
async function getKeihiStoreData(guildId, storeName, dateLabel) {
  return loadKeihiDailyData(guildId, storeName, dateLabel);
}
async function saveKeihiStoreData(guildId, storeName, data, dateLabel) {
  return saveKeihiDailyData(guildId, storeName, dateLabel, data);
}

// ==============================
// /設定経費 > 経費csv発行 用
// ==============================

function normalizeLabelFromBase(baseName, rangeType) {
  if (rangeType === 'daily') {
    // 新フォーマット: 20251206 → 2025-12-06 で返す
    if (DAILY_COMPACT_RE.test(baseName)) {
      return `${baseName.slice(0, 4)}-${baseName.slice(4, 6)}-${baseName.slice(6, 8)}`;
    }
    // 旧フォーマットは読み込まない
    return null;
  }

  if (rangeType === 'monthly') {
    if (MONTHLY_LABEL_RE.test(baseName)) return baseName;
    if (MONTHLY_LEGACY_RE.test(baseName)) {
      return `${baseName.slice(0, 4)}-${baseName.slice(4, 6)}`;
    }
    return null;
  }

  if (rangeType === 'yearly') {
    return YEARLY_LABEL_RE.test(baseName) ? baseName : null;
  }

  return null;
}

function getJsonPathByRange(guildId, storeName, rangeType, label) {
  switch (rangeType) {
    case 'daily':
      return getDailyJsonPath(guildId, storeName, label);
    case 'monthly':
      return getMonthlyJsonPath(guildId, storeName, label);
    case 'yearly':
      return getYearlyJsonPath(guildId, storeName, label);
    default:
      return getDailyJsonPath(guildId, storeName, label);
  }
}

// レガシー（ハイフンなし）パス
function getLegacyJsonPath(guildId, storeName, rangeType, label) {
  if (rangeType === 'daily') {
    return null; // 旧フォーマットは読まない
  }

  if (rangeType === 'monthly') {
    const compact = label.replace(/-/g, '');
    if (!MONTHLY_LEGACY_RE.test(compact)) return null;
    const year = compact.slice(0, 4);
    const month = compact.slice(4, 6);
    return path.join('GCS', guildId, 'keihi', storeName, year, month, `${compact}.json`);
  }

  return null;
}

async function readJsonWithLegacy(guildId, storeName, rangeType, label) {
  const primaryPath = getJsonPathByRange(guildId, storeName, rangeType, label);
  try {
    const data = await readJSON(primaryPath);
    if (data != null) return data;
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }

  const legacyPath = getLegacyJsonPath(guildId, storeName, rangeType, label);
  if (!legacyPath) return null;

  try {
    return await readJSON(legacyPath);
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
    return null;
  }
}

function getCsvPathByRange(guildId, storeName, rangeType, label) {
  switch (rangeType) {
    case 'daily':
      return getDailyCsvPath(guildId, storeName, label);
    case 'monthly':
      return getMonthlyCsvPath(guildId, storeName, label);
    case 'yearly':
      return getYearlyCsvPath(guildId, storeName, label);
    case 'quarter':
      return getQuarterCsvPath(guildId, storeName, label);
    default:
      return getDailyCsvPath(guildId, storeName, label);
  }
}

/**
 * 四半期ラベル一覧を、月別JSONから作る
 *  - 月別JSONが存在する年月を元に、
 *    1〜3月 / 4〜6月 / 7〜9月 / 10〜12月 をまとめてラベル化
 *  - ラベル形式: 'YYYY_01~03' など
 */
async function listQuarterTargetsFromMonthlyJson(guildId, storeName) {
  const root = path.join('GCS', guildId, 'keihi', storeName);
  const files = await listFiles(root);

  const monthlyLabels = (files || [])
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'))
    .filter(label => MONTHLY_LABEL_RE.test(label));

  const yearMonthMap = new Map(); // year -> Set(monthNumber)

  for (const label of monthlyLabels) {
    const year = label.slice(0, 4);
    const month = parseInt(label.slice(5, 7), 10);
    if (!yearMonthMap.has(year)) {
      yearMonthMap.set(year, new Set());
    }
    yearMonthMap.get(year).add(month);
  }

  const quarterLabels = [];
  const quarterRanges = [
    [1, 3],
    [4, 6],
    [7, 9],
    [10, 12],
  ];

  for (const [year, monthSet] of yearMonthMap.entries()) {
    for (const [start, end] of quarterRanges) {
      let exists = false;
      for (let m = start; m <= end; m++) {
        if (monthSet.has(m)) {
          exists = true;
          break;
        }
      }
      if (!exists) continue;

      const s = String(start).padStart(2, '0');
      const e = String(end).padStart(2, '0');
      const label = `${year}_${s}~${e}`;
      quarterLabels.push(label);
    }
  }

  quarterLabels.sort((a, b) => (a < b ? 1 : -1));
  return quarterLabels;
}

/**
 * 経費用 JSON のラベル一覧を取得
 *
 *  - rangeType = 'daily'   → 'YYYY-MM-DD'
 *  - rangeType = 'monthly' → 'YYYY-MM'
 *  - rangeType = 'yearly'  → 'YYYY'
 *  - rangeType = 'quarter' → 'YYYY_01~03' など（月別JSONを集計して生成）
 */
async function listKeihiJsonTargets(guildId, storeName, rangeType) {
  if (rangeType === 'quarter') {
    return listQuarterTargetsFromMonthlyJson(guildId, storeName);
  }

  const root = path.join('GCS', guildId, 'keihi', storeName);
  const files = await listFiles(root);

  const labels = new Set();

  for (const f of files || []) {
    if (!f.endsWith('.json')) continue;
    const base = path.basename(f, '.json');
    const normalized = normalizeLabelFromBase(base, rangeType);
    if (normalized) labels.add(normalized);
  }

  // 月別は、日別ファイルからも YYYY-MM を補完する（新フォーマット移行時の不足対策）
  if (rangeType === 'monthly') {
    for (const f of files || []) {
      if (!f.endsWith('.json')) continue;
      const base = path.basename(f, '.json');
      const dailyMatch = DAILY_COMPACT_RE.test(base)
        ? base
        : DAILY_LABEL_RE.test(base)
        ? base.replace(/-/g, '')
        : null;
      if (dailyMatch) {
        const yyyy = dailyMatch.slice(0, 4);
        const mm = dailyMatch.slice(4, 6);
        labels.add(`${yyyy}-${mm}`);
      }
    }
  }

  const result = Array.from(labels).sort((a, b) => (a < b ? 1 : -1));

  return result;
}

// ==============================
// JSON → CSV 変換ユーティリティ
// ==============================

function extractKeihiRecords(jsonData) {
  if (!jsonData) return [];

  if (Array.isArray(jsonData)) return jsonData;
  if (Array.isArray(jsonData.entries)) return jsonData.entries;
  if (Array.isArray(jsonData.requests)) return jsonData.requests;
  if (Array.isArray(jsonData.data)) return jsonData.data;

  if (typeof jsonData === 'object') {
    const values = Object.values(jsonData).filter(
      v => v && typeof v === 'object' && !Array.isArray(v),
    );
    return values;
  }

  return [];
}

function buildCsvHeaderKeys(records) {
  const set = new Set();

  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue;
    for (const key of Object.keys(rec)) {
      set.add(key);
    }
  }

  return Array.from(set);
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    return value.toISOString();
  }

  let text = String(value);

  if (text.includes('"')) {
    text = text.replace(/"/g, '""');
  }

  if (
    text.includes(',') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text.includes('\t') ||
    /^\s|\s$/.test(text)
  ) {
    text = `"${text}"`;
  }

  return text;
}

function buildCsvRows(records, headerKeys) {
  return records.map(rec => headerKeys.map(key => escapeCsvCell(rec && rec[key])).join(','));
}

/**
 * CSV 出力用に 1 レコードを「日本語カラムだけ」に整形する
 *
 * 内部の JSON は英語キーでもOK。
 * ここで必要な情報だけ抜き出して、列名を
 *   メッセージid ステータス 日付 部署 金額 備考
 *   申請者名 申請時間 修正者名 修正時間 承認者名 承認時間
 * に揃える。
 *
 * 日付 / 部署 / 金額 / 備考 は「最新の値」を使う想定。
 * （承認時に embed から読んで JSON に書いているので、修正が入っていればその値が入っている前提）
 */
function normalizeRecordForCsv(rec) {
  if (!rec || typeof rec !== 'object') return {};

  const statusJa =
    rec.status === 'APPROVED' || rec.status === '承認' ? '承認' : '申請中';

  const requesterName = rec.requesterName || rec.requester || '';
  const modifierName = rec.modifierName || rec.modifier || '';
  const approvedName = rec.approvedByName || rec.approvedBy || '';

  return {
    メッセージid: rec.id ?? '',
    ステータス: statusJa,
    日付: rec.date ?? '',
    部署: rec.department ?? '',
    金額: rec.amount ?? '',
    備考: rec.note ?? '',
    申請者名: requesterName,
    申請時間: rec.requestAtText ?? '',
    修正者名: modifierName,
    修正時間: rec.modifierAtText ?? '',
    承認者名: approvedName,
    承認時間: rec.approvedAtText ?? '',
  };
}

/**
 * 四半期ラベル 'YYYY_01~03' から対象の月ラベル配列を作る
 *  → ['YYYY-01', 'YYYY-02', 'YYYY-03']
 */
function getMonthlyLabelsForQuarter(quarterLabel) {
  const m = QUARTER_LABEL_RE.exec(quarterLabel);
  if (!m) return [];

  const year = quarterLabel.slice(0, 4);
  const rangePart = quarterLabel.slice(5); // '01~03'
  const [sStr, eStr] = rangePart.split('~');
  const start = parseInt(sStr, 10);
  const end = parseInt(eStr, 10);

  const labels = [];
  for (let month = start; month <= end; month++) {
    const mm = String(month).padStart(2, '0');
    labels.push(`${year}-${mm}`);
  }
  return labels;
}

/**
 * 指定された 年月日/年月/年/四半期 の JSON を CSV 化し、
 * 同じラベルの既存 CSV があれば末尾に追記して保存。
 *
 * 四半期の場合は、対象四半期の「月別JSON」を全部まとめて CSV にします。
 */
async function buildKeihiCsvForPeriod(guildId, storeName, rangeType, label) {
  let records = [];

  const collectDailyByPrefix = async prefixes => {
    const dailyLabels = await listKeihiJsonTargets(guildId, storeName, 'daily');
    const targetLabels = dailyLabels.filter(dl => prefixes.some(p => dl.startsWith(p)));

    for (const dl of targetLabels) {
      const jsonData = await readJsonWithLegacy(guildId, storeName, 'daily', dl);
      if (jsonData) records.push(...extractKeihiRecords(jsonData));
    }
  };

  if (rangeType === 'quarter') {
    const monthLabels = getMonthlyLabelsForQuarter(label); // ['YYYY-MM', ...]
    const monthPrefixes = monthLabels.map(m => `${m}-`);
    await collectDailyByPrefix(monthPrefixes);

    // 日次データが無い場合は月別集計JSONで埋める
    if (!records.length) {
      for (const monthLabel of monthLabels) {
        const jsonData = await readJsonWithLegacy(guildId, storeName, 'monthly', monthLabel);
        if (jsonData) records.push(...extractKeihiRecords(jsonData));
      }
    }
  } else if (rangeType === 'monthly') {
    await collectDailyByPrefix([`${label}-`]);

    if (!records.length) {
      const jsonData = await readJsonWithLegacy(guildId, storeName, 'monthly', label);
      records = extractKeihiRecords(jsonData);
    }
  } else if (rangeType === 'yearly') {
    await collectDailyByPrefix([`${label}-`]);

    if (!records.length) {
      const jsonData = await readJsonWithLegacy(guildId, storeName, 'yearly', label);
      records = extractKeihiRecords(jsonData);
    }
  } else {
    const jsonData = await readJsonWithLegacy(guildId, storeName, rangeType, label);
    records = extractKeihiRecords(jsonData);
  }

  // 日本語カラムに整形
  records = records.map(normalizeRecordForCsv);

  const csvPath = getCsvPathByRange(guildId, storeName, rangeType, label);

  if (!records.length) {
    const emptyBuffer = Buffer.from('', 'utf8');
    await saveBuffer(csvPath, emptyBuffer);
    const publicUrl = getPublicUrl(csvPath);
    return {
      buffer: emptyBuffer,
      fileName: path.basename(csvPath),
      publicUrl,
    };
  }

  const headerKeys = buildCsvHeaderKeys(records);
  const newRows = buildCsvRows(records, headerKeys);

  let existingCsv = '';
  let hasExisting = false;

  try {
    const buf = await downloadFileToBuffer(csvPath);
    existingCsv = buf.toString('utf8').trimEnd();
    if (existingCsv) hasExisting = true;
  } catch (err) {
    if (!err || err.code !== 'ENOENT') {
      throw err;
    }
  }

  let combinedCsv = '';

  if (!hasExisting) {
    combinedCsv = [headerKeys.join(','), ...newRows].join('\n');
  } else {
    combinedCsv = existingCsv + '\n' + newRows.join('\n');
  }

  const buffer = Buffer.from(combinedCsv, 'utf8');
  await saveBuffer(csvPath, buffer);
  const publicUrl = getPublicUrl(csvPath);

  return {
    buffer,
    fileName: path.basename(csvPath),
    publicUrl,
  };
}

// ==============================
// exports
// ==============================

module.exports = {
  // 日 / 月 / 年 データ (既存API)
  loadKeihiDailyData,
  saveKeihiDailyData,
  loadKeihiMonthlyData,
  saveKeihiMonthlyData,
  loadKeihiYearlyData,
  saveKeihiYearlyData,

  // JSON/CSV パス
  getDailyJsonPath,
  getMonthlyJsonPath,
  getYearlyJsonPath,
  getDailyCsvPath,
  getMonthlyCsvPath,
  getYearlyCsvPath,
  getQuarterCsvPath,

  // /設定経費 > 経費csv発行 用
  listKeihiJsonTargets,
  buildKeihiCsvForPeriod,

  // 互換
  getKeihiStoreData,
  saveKeihiStoreData,
};
