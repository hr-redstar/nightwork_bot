// src/utils/uriage/uriageCsvManager.js
// ----------------------------------------------------
// 売上 CSV の GCS 参照まわり
//   - 店舗ごとの CSV 一覧
//   - 日別 / 月別 / 四半期 切り分け
//   - ダウンロード URL の取得
//   - CSV の保存
// ----------------------------------------------------

const path = require('path');
const logger = require('../logger');
const { listFiles, getPublicUrl, readFile, writeFile } = require('../gcs');

// ベースパスはプロジェクト仕様に合わせて調整
// 例: GCS/{guildId}/uriage/csv/{storeId}/xxxx.csv
function uriageCsvBasePrefix(guildId, storeId) {
  return `${guildId}/uriage/csv/${storeId}/`;
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
  let m = base.match(/^(\d{4})-_-_$/);
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
  m = base.match(/^(\d{4})-_$/);
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
async function listUriageCsvOptions(guildId, storeId) {
  const prefix = uriageCsvBasePrefix(guildId, storeId);

  let files = [];
  try {
    files = await listFiles(prefix);
  } catch (err) {
    logger.error(`[uriageCsvManager] GCSからのファイル一覧取得に失敗: ${prefix}`, err);
    return { dates: [], months: [], quarters: [] };
  }

  const dates = [];
  const months = [];
  const quarters = [];

  for (const f of files) {
    const rel = f.name || f;
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
function getUriageCsvUrl(filePath) {
  try {
    return getPublicUrl(filePath);
  } catch (err) {
    logger.warn('[uriageCsvManager] getPublicUrl 失敗', err);
    return null;
  }
}

/**
 * 売上CSVの保存
 * @param {string} guildId
 * @param {string} storeId
 * @param {string} dateStr YYYY-MM-DD 形式
 * @param {object} data { date, user, approver, total, cash, card, cost, remain, createdAt }
 * @param {'ok'|'edited'|'deleted'} status
 */
async function saveUriageCsv(guildId, storeId, dateStr, data, status = 'ok') {
  const filePath = `${uriageCsvBasePrefix(guildId, storeId)}${dateStr}.csv`;

  // 新しいCSVヘッダ（ステータス列を追加）
  const header = '日付,入力者,承認者,総売り,現金,カード,諸経費,残金,登録日時,ステータス\n';
  const line = `${data.date},${data.user},${data.approver || ''},${data.total},${data.cash},${data.card},${data.cost},${data.remain},${data.createdAt},${status}\n`;

  let existingContent = '';
  try {
    existingContent = await readFile(filePath);
  } catch (err) {
    // ファイルが存在しない場合はエラーを無視
    if (err.code !== 404) {
      logger.warn(`[uriageCsvManager] 既存CSVファイル読み込み失敗: ${filePath}`, err);
    }
  }

  if (!existingContent) {
    // ファイルがなければ新しいヘッダと行を作成
    const newContent = header + line;
    await writeFile(filePath, newContent);
    return;
  }

  // 既存ファイルがある場合、ヘッダにステータス列がなければ互換処理を行う
  const lines = existingContent.split('\n');
  const existingHeader = lines[0] || '';
  let updatedContent = existingContent;

  if (!existingHeader.includes('ステータス')) {
    // 既存の各データ行末に ',ok' を追加して新ヘッダに合わせる
    const bodyLines = lines.slice(1).filter(l => l.trim().length > 0).map(l => `${l},ok`);
    updatedContent = header + bodyLines.join('\n') + '\n';
  }

  // 追記する
  await writeFile(filePath, updatedContent + line);
}

/**
 * Embed から CSV 保存用のデータを抽出する
 * @param {import('discord.js').EmbedBuilder} embed
 * @param {string} approverId
 * @returns {{date:string,user:string,approver:string,total:number,cash:number,card:number,cost:number,remain:number,createdAt:string}}
 */
function parseEmbedToCsvData(embed, approverId) {
  const fields = embed.data?.fields || embed.fields || [];
  const find = (name) => (fields.find(f => f.name === name) || {}).value || '';

  const date = find('日付');
  const total = parseInt((find('総売り') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const cash = parseInt((find('現金') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const card = parseInt((find('カード') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const cost = parseInt((find('諸経費') || '0').toString().replace(/[^0-9]/g, ''), 10) || 0;
  const remain = parseInt((find('残金') || (total - (card + cost))).toString().replace(/[^0-9\-]/g, ''), 10) || (total - (card + cost));
  const inputUser = find('入力者') || '';
  const inputTime = find('入力時間') || '';

  return {
    date,
    user: inputUser,
    approver: approverId ? `<@${approverId}>` : '',
    total,
    cash,
    card,
    cost,
    remain,
    createdAt: inputTime,
  };
}

module.exports = {
  listUriageCsvOptions,
  getUriageCsvUrl,
  saveUriageCsv,
  parseEmbedToCsvData,
};