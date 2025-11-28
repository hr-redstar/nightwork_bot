// src/handlers/keihi/setting/keihiCsvHandler.js
// ----------------------------------------------------
// 経費 CSV の GCS 参照まわり
//   - 店舗ごとの CSV 一覧
//   - 日別 / 月別 / 四半期 切り分け
//   - ダウンロード URL の取得
// ----------------------------------------------------

const path = require('path');
const logger = require('../../../utils/logger');
// gcs.js 側で listFiles と getPublicUrl 的な関数を用意しておく想定
const { listFiles, getPublicUrl } = require('../../../utils/gcs');

// ベースパスはプロジェクト仕様に合わせて調整
// 例: GCS/{guildId}/keihi/csv/{storeId}/xxxx.csv
function keihiCsvBasePrefix(guildId, storeId) {
  return `GCS/${guildId}/keihi/csv/${storeId}/`;
}

/**
 * CSV ファイル名から期間種別を判定して整形
 * 想定パターン:
 *   - YYYY-MM-DD.csv  → 日別
 *   - YYYY-MM.csv     → 月別
 *   - YYYYQn.csv      → 四半期 (例: 2024Q1.csv)
 */
function parseCsvPeriod(fileName) {
  const base = fileName.replace(/\.csv$/i, '');

  // YYYY-MM-DD
  let m = base.match(/^(\d{4})[-_](\d{2})[-_](\d{2})$/);
  if (m) {
    const [_, y, mo, d] = m;
    return {
      kind: 'date',
      key: `${y}-${mo}-${d}`,
      label: `${y}-${mo}-${d}`,
    };
  }

  // YYYYMMDD
  m = base.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const [_, y, mo, d] = m;
    return {
      kind: 'date',
      key: `${y}-${mo}-${d}`,
      label: `${y}-${mo}-${d}`,
    };
  }

  // YYYY-MM
  m = base.match(/^(\d{4})[-_](\d{2})$/);
  if (m) {
    const [_, y, mo] = m;
    return {
      kind: 'month',
      key: `${y}-${mo}`,
      label: `${y}-${mo}`,
    };
  }

  // YYYYMM
  m = base.match(/^(\d{4})(\d{2})$/);
  if (m) {
    const [_, y, mo] = m;
    return {
      kind: 'month',
      key: `${y}-${mo}`,
      label: `${y}-${mo}`,
    };
  }

  // YYYYQn
  m = base.match(/^(\d{4})[Qq]([1-4])$/);
  if (m) {
    const [_, y, q] = m;
    return {
      kind: 'quarter',
      key: `${y}Q${q}`,
      label: `${y}年第${q}四半期`,
    };
  }

  // 対応外
  return null;
}

/**
 * 店舗ごとの CSV 一覧を取得し、
 *   dates: [{ key, label, filePath }]
 *   months: ...
 *   quarters: ...
 * に分けて返す
 */
async function listKeihiCsvOptions(guildId, storeId) {
  const prefix = keihiCsvBasePrefix(guildId, storeId);

  let files = [];
  try {
    files = await listFiles(prefix);
  } catch (err) {
    logger.error(`[keihiCsvHandler] GCSからのファイル一覧取得に失敗: ${prefix}`, err);
    return { dates: [], months: [], quarters: [] };
  }

  const dates = [];
  const months = [];
  const quarters = [];

  for (const f of files) {
    // f.name がフルパス、最後のファイル名を抜き出す想定
    const rel = f.name || f; // utils 実装に合わせる
    const fileName = path.basename(rel);
    if (!fileName.toLowerCase().endsWith('.csv')) continue;

    const period = parseCsvPeriod(fileName);
    if (!period) continue;

    const item = {
      key: period.key,
      label: period.label,
      filePath: rel,
    };

    if (period.kind === 'date') dates.push(item);
    else if (period.kind === 'month') months.push(item);
    else if (period.kind === 'quarter') quarters.push(item);
  }

  // ソート（キー昇順）
  const byKey = (a, b) => (a.key > b.key ? 1 : a.key < b.key ? -1 : 0);
  dates.sort(byKey);
  months.sort(byKey);
  quarters.sort(byKey);

  return { dates, months, quarters };
}

/**
 * 単一 CSV の download URL を取得
 * （getPublicUrl 実装に依存）
 */
function getKeihiCsvUrl(filePath) {
  try {
    return getPublicUrl(filePath);
  } catch (err) {
    logger.warn('[keihiCsvHandler] getPublicUrl 失敗', err);
    return null;
  }
}

module.exports = {
  listKeihiCsvOptions,
  getKeihiCsvUrl,
};
