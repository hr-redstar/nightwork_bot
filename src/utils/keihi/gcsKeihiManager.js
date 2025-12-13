// src/utils/keihi/gcsKeihiManager.js
// ----------------------------------------------------
// 経費データの GCS 読み書きユーティリティ
//   - 日別 / 月別 / 年別 JSON & CSV
//   - 四半期 CSV（四半期フォルダ配下、月別JSONから集計）
//   - /設定経費 &gt; 経費csv発行 で使用
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

const DAILY_COMPACT_RE = /^\d{8}$/;            // 20251206
const DAILY_LABEL_RE = /^(\d{4})-(\d{2})-(\d{2})$/; // 2025-12-06
const MONTHLY_LABEL_RE = /^\d{4}-\d{2}$/;       // 2025-12
const MONTHLY_LEGACY_RE = /^\d{6}$/;           // 202512
const YEARLY_LABEL_RE = /^\d{4}$/; // 2025
const QUARTER_LABEL_RE = /^\d{4}_\d{2}~\d{2}$/; // 2025_01~03

// path.posix を使って "GCS/..." 形式を維持
const join = (...segs) => path.posix.join(...segs);
const ROOT = 'GCS';

// ---------------------------------------------
// 日付文字列の正規化ヘルパー
// ---------------------------------------------
function normalizeDateLabel(label) {
  if (!label) throw new Error('date label is required');

  // 2025/12/13 or 2025-12-13 → 2025-12-13
  const replaced = String(label).trim().replace(/\//g, '-');

  if (DAILY_LABEL_RE.test(replaced)) {
    return replaced;
  }

  // 20251213 → 2025-12-13
  const m = DAILY_COMPACT_RE.exec(replaced);
  if (m) {
    const v = m[0];
    const y = v.slice(0, 4);
    const mo = v.slice(4, 6);
    const d = v.slice(6, 8);
    return `${y}-${mo}-${d}`;
  }

  throw new Error(`unsupported date label format: ${label}`);
}

function splitDateParts(label) {
  const normalized = normalizeDateLabel(label);
  const m = DAILY_LABEL_RE.exec(normalized); // YYYY-MM-DD
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];
  return { normalized, yyyy, mm, dd };
}

function normalizeMonthLabel(label) {
  if (!label) throw new Error('month label is required');
  const trimmed = String(label).trim();

  if (MONTHLY_LABEL_RE.test(trimmed)) {
    return trimmed; // YYYY-MM
  }
  const m = MONTHLY_LEGACY_RE.exec(trimmed); // 202512 → 2025-12
  if (m) {
    const y = trimmed.slice(0, 4);
    const mo = trimmed.slice(4, 6);
    return `${y}-${mo}`;
  }
  throw new Error(`unsupported month label: ${label}`);
}

function splitMonthParts(label) {
  const normalized = normalizeMonthLabel(label);
  const [yyyy, mm] = normalized.split('-');
  return { normalized, yyyy, mm };
}

function normalizeYearLabel(label) {
  const trimmed = String(label).trim();
  if (!YEARLY_LABEL_RE.test(trimmed)) {
    throw new Error(`unsupported year label: ${label}`);
  }
  return trimmed;
}

// ---------------------------------------------
// 日別パス (JSON / CSV)
//   GCS/ギルドID/keihi/店舗名/年/月/日/年月日.json
//   GCS/ギルドID/keihi/店舗名/年/月/日/年月日.csv
// ---------------------------------------------
function buildDailyBaseDir(guildId, storeId, dateLabel) {
  const { normalized, yyyy, mm, dd } = splitDateParts(dateLabel);
  const compact = `${yyyy}${mm}${dd}`;
  return {
    normalized,
    compact,
    dir: join(ROOT, String(guildId), 'keihi', String(storeId), yyyy, mm, dd),
  };
}

function getDailyJsonPath(guildId, storeId, dateLabel) {
  const { compact, dir } = buildDailyBaseDir(guildId, storeId, dateLabel);
  return join(dir, `${compact}.json`);
}

function getDailyCsvPath(guildId, storeId, dateLabel) {
  const { compact, dir } = buildDailyBaseDir(guildId, storeId, dateLabel);
  return join(dir, `${compact}.csv`);
}

// ---------------------------------------------
// 月別パス
//   GCS/ギルドID/keihi/店舗名/年/月/年月.json
//   GCS/ギルドID/keihi/店舗名/年/月/年月.csv
// ---------------------------------------------
function buildMonthlyBaseDir(guildId, storeId, monthLabel) {
  const { normalized, yyyy, mm } = splitMonthParts(monthLabel);
  return {
    normalized,
    dir: join(ROOT, String(guildId), 'keihi', String(storeId), yyyy, mm),
  };
}

function getMonthlyJsonPath(guildId, storeId, monthLabel) {
  const { normalized, dir } = buildMonthlyBaseDir(guildId, storeId, monthLabel);
  return join(dir, `${normalized}.json`);
}

function getMonthlyCsvPath(guildId, storeId, monthLabel) {
  const { normalized, dir } = buildMonthlyBaseDir(guildId, storeId, monthLabel);
  return join(dir, `${normalized}.csv`);
}

// ---------------------------------------------
// 年別パス
//   GCS/ギルドID/keihi/店舗名/年/年.json
//   GCS/ギルドID/keihi/店舗名/年/年.csv
// ---------------------------------------------
function buildYearlyBaseDir(guildId, storeId, yearLabel) {
  const yyyy = normalizeYearLabel(yearLabel);
  return {
    yyyy,
    dir: join(ROOT, String(guildId), 'keihi', String(storeId), yyyy),
  };
}

function getYearlyJsonPath(guildId, storeId, yearLabel) {
  const { yyyy, dir } = buildYearlyBaseDir(guildId, storeId, yearLabel);
  return join(dir, `${yyyy}.json`);
}

function getYearlyCsvPath(guildId, storeId, yearLabel) {
  const { yyyy, dir } = buildYearlyBaseDir(guildId, storeId, yearLabel);
  return join(dir, `${yyyy}.csv`);
}

// ---------------------------------------------
// 四半期 CSV
//   GCS/ギルドID/keihi/店舗名/四半期/2025_01~03.csv など
// ---------------------------------------------
function getQuarterlyCsvPath(guildId, storeId, quarterLabel) {
  // quarterLabel 例: "2025_01~03" をそのままファイル名に使う
  const safeLabel = String(quarterLabel).trim();
  return join(
    ROOT,
    String(guildId),
    'keihi',
    String(storeId),
    '四半期',
    `${safeLabel}.csv`,
  );
}

// ---------------------------------------------
// 日別 JSON 読み書き
// ---------------------------------------------
async function loadKeihiDailyData(guildId, storeId, dateLabel) {
  const primaryPath = getDailyJsonPath(guildId, storeId, dateLabel);

  // ✅ 新仕様パスだけを見る
  try {
    return await readJSON(primaryPath);
  } catch (e) {
    // ファイルが無ければ null、それ以外のエラーはそのまま投げる
    if (!e || e.code !== 'ENOENT') {
      throw e;
    }
    return null;
  }
}

async function saveKeihiDailyData(guildId, storeId, dateLabel, data) {
  const primaryPath = getDailyJsonPath(guildId, storeId, dateLabel);
  await saveJSON(primaryPath, data);

  // 旧パスへの保存が不要ならここはコメントアウトのままでOK
  /*
  const legacyLabel = normalizeDateLabel(dateLabel);
  const legacyDir = join(
    ROOT,
    String(guildId),
    'keihi',
    String(storeId),
    legacyLabel,
  );
  const legacyPath = join(legacyDir, `${legacyLabel}.json`);
  await saveJSON(legacyPath, data);
  */
}

async function loadKeihiMonthlyData(guildId, storeId, monthLabel) {
  const primaryPath = getMonthlyJsonPath(guildId, storeId, monthLabel);

  try {
    return await readJSON(primaryPath);
  } catch (e1) {
    return null;
  }
}

async function saveKeihiMonthlyData(guildId, storeId, monthLabel, data) {
  const primaryPath = getMonthlyJsonPath(guildId, storeId, monthLabel);
  await saveJSON(primaryPath, data);
}

async function loadKeihiYearlyData(guildId, storeId, yearLabel) {
  const primaryPath = getYearlyJsonPath(guildId, storeId, yearLabel);
  try {
    return await readJSON(primaryPath);
  } catch (e1) {
    return null;
  }
}

async function saveKeihiYearlyData(guildId, storeId, yearLabel, data) {
  const primaryPath = getYearlyJsonPath(guildId, storeId, yearLabel);
  await saveJSON(primaryPath, data);
}

// ==============================
// /設定経費 &gt; 経費csv発行 用
// ==============================

function normalizeLabelFromBase(baseName, rangeType) {
  if (rangeType === 'daily') {
    // ✅ 新フォーマット: 20251213 → ラベルは 2025-12-13 に正規化
    if (DAILY_COMPACT_RE.test(baseName)) {
      return `${baseName.slice(0, 4)}-${baseName.slice(4, 6)}-${baseName.slice(6, 8)}`;
    }
    // ❌ 旧フォーマット (2025-12-13.json) は daily ラベルに採用しない
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

function getJsonPathByRange(guildId, storeId, rangeType, label) {
  switch (rangeType) {
    case 'daily':
      return getDailyJsonPath(guildId, storeId, label);
    case 'monthly':
      return getMonthlyJsonPath(guildId, storeId, label);
    case 'yearly':
      return getYearlyJsonPath(guildId, storeId, label);
    default:
      return getDailyJsonPath(guildId, storeId, label);
  }
}

// レガシー（ハイフンなし）パス
function getLegacyJsonPath(guildId, storeId, rangeType, label) {
  if (rangeType === 'daily') {
    return null; // 旧フォーマットは読まない
  }

  if (rangeType === 'monthly') {
    const compact = label.replace(/-/g, '');
    if (!MONTHLY_LEGACY_RE.test(compact)) return null;
    const year = compact.slice(0, 4);
    const month = compact.slice(4, 6);
    return join(
      ROOT,
      String(guildId),
      'keihi',
      String(storeId),
      year,
      month,
      `${compact}.json`,
    );
  }

  return null;
}

async function readJsonWithLegacy(guildId, storeId, rangeType, label) {
  const primaryPath = getJsonPathByRange(guildId, storeId, rangeType, label);
  try {
    const data = await readJSON(primaryPath);
    if (data != null) return data;
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }

  const legacyPath = getLegacyJsonPath(guildId, storeId, rangeType, label);
  if (!legacyPath) return null;

  try {
    return await readJSON(legacyPath);
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
    return null;
  }
}

function getCsvPathByRange(guildId, storeId, rangeType, label) {
  switch (rangeType) {
    case 'daily':
      return getDailyCsvPath(guildId, storeId, label);
    case 'monthly':
      return getMonthlyCsvPath(guildId, storeId, label);
    case 'yearly':
      return getYearlyCsvPath(guildId, storeId, label);
    case 'quarter':
      return getQuarterlyCsvPath(guildId, storeId, label);
    default:
      return getDailyCsvPath(guildId, storeId, label);
  }
}

/**
 * 四半期ラベル一覧を、月別JSONから作る
 *  - 月別JSONが存在する年月を元に、
 *    1〜3月 / 4〜6月 / 7〜9月 / 10〜12月 をまとめてラベル化
 *  - ラベル形式: 'YYYY_01~03' など
 */
async function listQuarterTargetsFromMonthlyJson(guildId, storeId) {
  const root = join(ROOT, String(guildId), 'keihi', String(storeId));
  const files = await listFiles(root);

  const monthlyLabels = (files || [])
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.posix.basename(f, '.json'))
    .filter((label) => MONTHLY_LABEL_RE.test(label));

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

  // 新しい順
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
async function listKeihiJsonTargets(guildId, storeId, rangeType) {
  if (rangeType === 'quarter') {
    return listQuarterTargetsFromMonthlyJson(guildId, storeId);
  }

  const root = join(ROOT, String(guildId), 'keihi', String(storeId));
  const files = await listFiles(root);

  const labels = new Set();

  // まずは各 .json の baseName から直接ラベルを取る
  for (const f of files || []) {
    if (!f.endsWith('.json')) continue;
    const base = path.posix.basename(f, '.json');
    const normalized = normalizeLabelFromBase(base, rangeType);
    if (normalized) labels.add(normalized);
  }

  // 月別は、日別ファイルからも YYYY-MM を補完する（新フォーマット移行時の不足対策）
  if (rangeType === 'monthly') {
    for (const f of files || []) {
      if (!f.endsWith('.json')) continue;
      const base = path.posix.basename(f, '.json');

    // ✅ 新形式の 8桁ファイル名だけを見る
    const dailyMatch = DAILY_COMPACT_RE.test(base) ? base : null;
      if (dailyMatch) {
        const yyyy = dailyMatch.slice(0, 4);
        const mm = dailyMatch.slice(4, 6);
        labels.add(`${yyyy}-${mm}`);
      }
    }
  }

  const result = Array.from(labels).sort((a, b) => (a < b ? 1 : -1)); // 新しい順

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
      (v) => v && typeof v === 'object' && !Array.isArray(v),
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
  return records.map((rec) =>
    headerKeys.map((key) => escapeCsvCell(rec && rec[key])).join(','),
  );
}

/**
 * CSV 出力用に 1 レコードを「日本語カラムだけ」に整形する
 *
 * 内部の JSON は英語キーでもOK。
 * ここで必要な情報だけ抜き出して、列名を
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
async function buildKeihiCsvForPeriod(guildId, storeId, rangeType, label) {
  let records = [];

  const collectDailyByPrefix = async (prefixes) => {
    const dailyLabels = await listKeihiJsonTargets(guildId, storeId, 'daily');
    const targetLabels = dailyLabels.filter((dl) =>
      prefixes.some((p) => dl.startsWith(p)),
    );

    for (const dl of targetLabels) {
      const jsonData = await readJsonWithLegacy(guildId, storeId, 'daily', dl);
      if (jsonData) records.push(...extractKeihiRecords(jsonData));
    }
  };

  if (rangeType === 'quarter') {
    const monthLabels = getMonthlyLabelsForQuarter(label); // ['YYYY-MM', ...]
    const monthPrefixes = monthLabels.map((m) => `${m}-`);
    await collectDailyByPrefix(monthPrefixes);

    // 日次データが無い場合は月別集計JSONで埋める
    if (!records.length) {
      for (const monthLabel of monthLabels) {
        const jsonData = await readJsonWithLegacy(
          guildId,
          storeId,
          'monthly',
          monthLabel,
        );
        if (jsonData) records.push(...extractKeihiRecords(jsonData));
      }
    }
  } else if (rangeType === 'monthly') {
    await collectDailyByPrefix([`${label}-`]);

    if (!records.length) {
      const jsonData = await readJsonWithLegacy(
        guildId,
        storeId,
        'monthly',
        label,
      );
      records = extractKeihiRecords(jsonData);
    }
  } else if (rangeType === 'yearly') {
    await collectDailyByPrefix([`${label}-`]);

    if (!records.length) {
      const jsonData = await readJsonWithLegacy(
        guildId,
        storeId,
        'yearly',
        label,
      );
      records = extractKeihiRecords(jsonData);
    }
  } else {
    // daily
    const jsonData = await readJsonWithLegacy(guildId, storeId, rangeType, label);
    records = extractKeihiRecords(jsonData);
  }

  // 日本語カラムに整形
  records = records.map(normalizeRecordForCsv);

  const csvPath = getCsvPathByRange(guildId, storeId, rangeType, label);

  if (!records.length) {
    const emptyBuffer = Buffer.from('', 'utf8');
    await saveBuffer(csvPath, emptyBuffer);
    const publicUrl = getPublicUrl(csvPath);
    return {
      buffer: emptyBuffer,
      fileName: path.posix.basename(csvPath),
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
    fileName: path.posix.basename(csvPath),
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
  getDailyCsvPath, // 修正: getDailyCsvPath
  getMonthlyCsvPath, // 修正: getMonthlyCsvPath
  getYearlyCsvPath, // 修正: getYearlyCsvPath
  getQuarterlyCsvPath, // 修正: getQuarterlyCsvPath

  // /設定経費 &gt; 経費csv発行 用
  listKeihiJsonTargets,
  buildKeihiCsvForPeriod,

};
