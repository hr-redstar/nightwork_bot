// src/utils/uriage/gcsUriageManager.js
// ----------------------------------------------------
// 螢ｲ荳翫ョ繝ｼ繧ｿ縺ｮ GCS 隱ｭ縺ｿ譖ｸ縺阪Θ繝ｼ繝・ぅ繝ｪ繝・ぅ
//   - 譌･蛻･ / 譛亥挨 / 蟷ｴ蛻･ JSON & CSV
//   - 蝗帛濠譛・CSV・亥屁蜊頑悄繝輔か繝ｫ繝驟堺ｸ九∵怦蛻･JSON縺九ｉ髮・ｨ茨ｼ・//   - /險ｭ螳壼｣ｲ荳・> 螢ｲ荳劃sv逋ｺ陦・縺ｧ菴ｿ逕ｨ
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

const DAILY_LABEL_RE = /^\d{4}-\d{2}-\d{2}$/; // 2025-12-06
const DAILY_COMPACT_RE = /^\d{8}$/; // 20251206
const MONTHLY_LABEL_RE = /^\d{4}-\d{2}$/; // 2025-12
const MONTHLY_LEGACY_RE = /^\d{6}$/; // 202512
const YEARLY_LABEL_RE = /^\d{4}$/; // 2025
const QUARTER_LABEL_RE = /^\d{4}_\d{2}~\d{2}$/; // 2025_01~03

// ==============================
// 繝代せ繝倥Ν繝代・・・SON・・// ==============================
function getDailyJsonPath(guildId, storeName, dateLabel) {
  const y = dateLabel.slice(0, 4);
  const m = dateLabel.slice(5, 7);
  const d = dateLabel.slice(8, 10);
  const compact = `${y}${m}${d}`;
  return path.join('GCS', guildId, 'uriage', storeName, y, m, d, `${compact}.json`);
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
// 繝代せ繝倥Ν繝代・・・SV・・// ==============================
function getDailyCsvPath(guildId, storeName, dateLabel) {
  const y = dateLabel.slice(0, 4);
  const m = dateLabel.slice(5, 7);
  const d = dateLabel.slice(8, 10);
  const compact = `${y}${m}${d}`;
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
 * 譌･谺｡繝・・繧ｿ縺ｫ1莉ｶ霑ｽ險倥☆繧狗ｰ｡譏薙・繝ｫ繝代・
 * @param {string} guildId
 * @param {{
 *   storeName: string,
 *   date: string,
 *   amount?: number,
 *   total?: number,
 *   genkin?: number,
 *   kake?: number,
 *   expense?: number,
 *   zankin?: number,
 *   [key: string]: any
 * }} record
 */
async function appendUriageRecord(guildId, record) {
  const { storeName, date } = record;
  if (!storeName || !date) return null;

  const dailyData = (await loadUriageDailyData(guildId, storeName, date)) || {};
  if (!Array.isArray(dailyData.requests)) dailyData.requests = [];

  dailyData.requests.push(record);
  dailyData.guildId = guildId;
  dailyData.storeId = storeName;
  dailyData.date = date;
  dailyData.lastUpdated = new Date().toISOString();

  await saveUriageDailyData(guildId, storeName, date, dailyData);
  return dailyData;
}

// ==============================
// JSON 隱ｭ縺ｿ譖ｸ縺・// ==============================
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
  const compactPath = getDailyJsonPath(guildId, storeName, dateLabel);
  const compactData = await safeLoadJson(compactPath, null);
  if (compactData) return compactData;

  // 旧フォーマット（YYYY-MM-DD.json）も一応読む
  const legacyPath = path.join(
    'GCS',
    guildId,
    'uriage',
    storeName,
    dateLabel.slice(0, 4),
    dateLabel.slice(5, 7),
    dateLabel.slice(8, 10),
    `${dateLabel}.json`,
  );
  const legacyData = await safeLoadJson(legacyPath, null);
  return legacyData ?? {};
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
  // 譌ｧ繝輔か繝ｼ繝槭ャ繝・YYYYMM.json
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
// JSON 繧ｿ繝ｼ繧ｲ繝・ヨ荳隕ｧ
// ==============================
function getLabelRegex(rangeType) {
  switch (rangeType) {
    case 'daily':
      return DAILY_LABEL_RE;
    case 'monthly':
      return MONTHLY_LABEL_RE;
    case 'yearly':
      return YEARLY_LABEL_RE;
    default:
      return DAILY_LABEL_RE;
  }
}

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
  const re = getLabelRegex(rangeType);

  const files = await listFiles(root).catch(() => []);

  const labels = (files || [])
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'))
    .map(label => {
      if (rangeType === 'daily') return normalizeDailyLabel(label);
      if (rangeType === 'monthly') return normalizeMonthlyLabel(label);
      return label;
    })
    .filter(Boolean)
    .filter(label => re.test(label))
    .sort((a, b) => (a < b ? 1 : -1));

  return labels;
}

async function listQuarterTargetsFromMonthlyJson(guildId, storeName) {
  const root = path.join('GCS', guildId, 'uriage', storeName);
  const files = await listFiles(root).catch(() => []);
  const monthlyLabels = (files || [])
    .filter(f => f.endsWith('.json'))
    .map(f => path.basename(f, '.json'))
    .map(normalizeMonthlyLabel)
    .filter(Boolean);

  const yearMonthMap = new Map(); // year -> Set(monthNumber)
  for (const label of monthlyLabels) {
    const year = label.slice(0, 4);
    const month = parseInt(label.slice(5, 7), 10);
    if (!yearMonthMap.has(year)) yearMonthMap.set(year, new Set());
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
      quarterLabels.push(`${year}_${s}~${e}`);
    }
  }

  quarterLabels.sort((a, b) => (a < b ? 1 : -1));
  return quarterLabels;
}

// ==============================
// JSON 竊・CSV 螟画鋤
// ==============================
function extractRecords(jsonData) {
  if (!jsonData) return [];
  if (Array.isArray(jsonData)) return jsonData;
  if (Array.isArray(jsonData.requests)) return jsonData.requests;
  if (Array.isArray(jsonData.entries)) return jsonData.entries;
  if (Array.isArray(jsonData.data)) return jsonData.data;
  if (typeof jsonData === 'object') {
    return Object.values(jsonData).filter(v => v && typeof v === 'object' && !Array.isArray(v));
  }
  return [];
}

function normalizeRecordForCsv(rec) {
  if (!rec || typeof rec !== "object") return {};
  const statusJa =
    rec.status === 'APPROVED' || rec.status === '承認' ? '承認' : '申請中';

  const requesterName = rec.requesterName || rec.requester || "";
  const modifierName = rec.modifierName || rec.modifier || "";
  const approverName = rec.approvedByName || rec.approvedBy || "";

  return {
    メッセージid: rec.id ?? "",
    ステータス: statusJa,
    日付: rec.date ?? '',
    総売り: rec.total ?? '',
    現金: rec.cash ?? '',
    カード: rec.card ?? '',
    売掛: rec.credit ?? '',
    諸経費: rec.expense ?? '',
    残金: rec.remain ?? '',
    申請者名: requesterName,
    申請時間: rec.requestAtText ?? '',
    修正者名: modifierName,
    修正時間: rec.modifierAtText ?? '',
    承認者名: approverName,
    承認時間: rec.approvedAtText ?? '',
  };
}

function buildCsvHeaderKeys(records) {
  const set = new Set();
  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue;
    for (const k of Object.keys(rec)) set.add(k);
  }
  return Array.from(set);
}

function buildCsvRows(records, headerKeys) {
  return records.map(rec =>
    headerKeys.map(k => escapeCsvCell(rec && rec[k])).join(','),
  );
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (text.includes('"')) text = text.replace(/"/g, '""');
  if (/[,"\r\n\t]/.test(text) || /^\s|\s$/.test(text)) {
    text = `"${text}"`;
  }
  return text;
}

function getMonthlyLabelsForQuarter(quarterLabel) {
  const m = QUARTER_LABEL_RE.exec(quarterLabel);
  if (!m) return [];
  const year = quarterLabel.slice(0, 4);
  const [sStr, eStr] = quarterLabel.slice(5).split('~');
  const start = parseInt(sStr, 10);
  const end = parseInt(eStr, 10);
  const labels = [];
  for (let mo = start; mo <= end; mo++) {
    labels.push(`${year}-${String(mo).padStart(2, '0')}`);
  }
  return labels;
}

/**
 * 謖・ｮ壹＆繧後◆ 蟷ｴ譛域律/蟷ｴ譛・蟷ｴ/蝗帛濠譛・縺ｮ JSON 繧・CSV 蛹悶＠縲・ * 蜷後§繝ｩ繝吶Ν縺ｮ譌｢蟄・CSV 縺後≠繧後・譛ｫ蟆ｾ縺ｫ霑ｽ險倥＠縺ｦ菫晏ｭ倥・ *
 * @param {string} guildId
 * @param {string} storeName
 * @param {'daily'|'monthly'|'yearly'|'quarter'} rangeType
 * @param {string} label
 * @returns {Promise<{ buffer: Buffer, fileName: string, publicUrl: string }>}
 */
async function buildUriageCsvForPeriod(guildId, storeName, rangeType, label) {
  let records = [];

  if (rangeType === 'quarter') {
    const monthLabels = getMonthlyLabelsForQuarter(label);
    for (const monthLabel of monthLabels) {
      const jsonPath = getMonthlyJsonPath(guildId, storeName, monthLabel);
      try {
        const jsonData = await readJSON(jsonPath);
        records.push(...extractRecords(jsonData));
      } catch (err) {
        if (!err || err.code !== 'ENOENT') throw err;
      }
    }
  } else if (rangeType === 'yearly') {
    const jsonPath = getYearlyJsonPath(guildId, storeName, label);
    const jsonData = await readJSON(jsonPath);
    records = extractRecords(jsonData);
  } else if (rangeType === 'monthly') {
    const jsonPath = getMonthlyJsonPath(guildId, storeName, label);
    const jsonData = await readJSON(jsonPath);
    records = extractRecords(jsonData);
  } else {
    const jsonPath = getDailyJsonPath(guildId, storeName, label);
    const jsonData = await readJSON(jsonPath);
    records = extractRecords(jsonData);
  }

  records = records.map(normalizeRecordForCsv);

  const csvPath = (() => {
    if (rangeType === 'quarter') return getQuarterCsvPath(guildId, storeName, label);
    if (rangeType === 'yearly') return getYearlyCsvPath(guildId, storeName, label);
    if (rangeType === 'monthly') return getMonthlyCsvPath(guildId, storeName, label);
    return getDailyCsvPath(guildId, storeName, label);
  })();

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
    if (!err || err.code !== 'ENOENT') throw err;
  }

  const combinedCsv = hasExisting
    ? existingCsv + '\n' + newRows.join('\n')
    : [headerKeys.join(','), ...newRows].join('\n');

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
  loadUriageDailyData,
  saveUriageDailyData,
  loadUriageMonthlyData,
  saveUriageMonthlyData,
  loadUriageYearlyData,
  saveUriageYearlyData,

  // 繝代せ
  getDailyJsonPath,
  getMonthlyJsonPath,
  getYearlyJsonPath,
  getDailyCsvPath,
  getMonthlyCsvPath,
  getYearlyCsvPath,
  getQuarterCsvPath,

  // 繧ｿ繝ｼ繧ｲ繝・ヨ荳隕ｧ & CSV逕滓・
  listUriageJsonTargets,
  buildUriageCsvForPeriod,
};

