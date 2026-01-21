// src/utils/keihi/keihiCsvGenerator.js
// ----------------------------------------------------
// 経費集計 JSON（日 / 月 / 年）→ CSV 生成
//   - 日別: 1行1申請
//   - 月別: 1行1日（その日の承認済み合計）
//   - 年別: 1行1月（承認済み合計）
//   - 四半期: 1行1四半期（年別JSONから集計）
// ----------------------------------------------------

const fs = require('fs/promises');
const path = require('path');
const logger = require('../../logger');

const LOCAL_GCS_ROOT = path.resolve(process.cwd(), 'local_data', 'gcs');

function objectPathToLocal(objectPath) {
  let p = String(objectPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!p.startsWith('GCS/')) p = `GCS/${p}`;
  const stripped = p.slice('GCS/'.length);
  return path.join(LOCAL_GCS_ROOT, stripped);
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (!/[",\r\n]/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function normalizeTimeForCsv(v) {
  const s = String(v ?? '').trim();
  // Discord timestamp: <t:1234567890> または <t:1234567890:f> など
  // HTMLエスケープされた &lt;t:...&gt; にも対応
  const m = s.match(/^(?:<|&lt;)t:(\d+)(?::[tTdDfFR])?(?:>|&gt;)$/);
  if (!m) return s;

  const ms = Number(m[1]) * 1000;
  if (!Number.isFinite(ms)) return s;

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date(ms))
      .replace(/\//g, '-');
  } catch {
    return s;
  }
}

function rowsToCsv(rows) {
  return rows
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');
}

async function writeCsv(objectPath, rows) {
  const csvText = rowsToCsv(rows);
  const localPath = objectPathToLocal(objectPath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, csvText, 'utf8');
  logger.info(`[keihiCsvGenerator] CSVを書き出しました: ${localPath}`);
}

// 日別 CSV: 1行1申請
async function generateDailyCsv(guild, storeId, dailyData) {
  if (!dailyData || !Array.isArray(dailyData.requests) || !dailyData.requests.length) {
    return;
  }

  const storeName = dailyData.storeName || storeId || '';
  const dateStr = dailyData.date || '';

  const header = [
    'メッセージid',
    'ステータス',
    '日付',
    '部署',
    '経費項目',
    '金額',
    '備考',
    '申請者名',
    '申請時間',
    '修正者名',
    '修正時間',
    '承認者名',
    '承認時間',
  ];

  const rows = [header];
  const seen = new Set();

  for (const r of dailyData.requests) {
    // 重複排除: 同じメッセージIDがあればスキップ
    const key = String(r.id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);

    rows.push([
      r.id || '',
      r.statusJa || '',
      r.date || dateStr,
      r.department || '',
      r.item || '',
      r.amount != null ? Number(r.amount) : '',
      r.note || '',
      r.requesterName || '',
      normalizeTimeForCsv(r.requestAtText || r.inputTimeText || r.requestedAt),
      r.modifierName || '',
      normalizeTimeForCsv(r.modifierAtText || r.modifiedAt),
      r.approvedByName || '',
      normalizeTimeForCsv(r.approvedAtText || r.approvedAt),
    ]);
  }

  const objectPath = `GCS/${guild.id}/keihi/csv/${storeName}/${dateStr}.csv`;
  await writeCsv(objectPath, rows);
}

// 月別 CSV: 1行1日（byDay）
async function generateMonthlyCsv(guild, storeId, monthlyData) {
  if (!monthlyData || !monthlyData.byDay) return;

  const guildName = guild.name;
  const storeName = storeId || '';
  const monthKey = monthlyData.month || '';

  const header = ['ギルド名', '店舗名', '対象月', '日付', '日別承認済み合計'];
  const rows = [header];

  const entries = Object.entries(monthlyData.byDay).sort(([d1], [d2]) =>
    d1 > d2 ? 1 : d1 < d2 ? -1 : 0,
  );

  for (const [dateStr, amount] of entries) {
    rows.push([guildName, storeName, monthKey, dateStr, Number(amount) || 0]);
  }

  rows.push([
    guildName,
    storeName,
    monthKey,
    '合計',
    Number(monthlyData.totalApprovedAmount) || 0,
  ]);

  const objectPath = `GCS/${guild.id}/keihi/csv/${storeName}/${monthKey}.csv`;
  await writeCsv(objectPath, rows);
}

// 年別 CSV: 1行1月（byMonth）
async function generateYearlyCsv(guild, storeId, yearlyData) {
  if (!yearlyData || !yearlyData.byMonth) return;

  const guildName = guild.name;
  const storeName = storeId || '';
  const year = yearlyData.year || '';

  const header = ['ギルド名', '店舗名', '年', '月', '承認済み合計'];
  const rows = [header];

  const entries = Object.entries(yearlyData.byMonth).sort(([m1], [m2]) =>
    m1 > m2 ? 1 : m1 < m2 ? -1 : 0,
  );

  for (const [monthKey, amount] of entries) {
    rows.push([guildName, storeName, year, monthKey, Number(amount) || 0]);
  }

  rows.push([
    guildName,
    storeName,
    year,
    '合計',
    Number(yearlyData.totalApprovedAmount) || 0,
  ]);

  const objectPath = `GCS/${guild.id}/keihi/csv/${storeName}/${year}.csv`;
  await writeCsv(objectPath, rows);
}

// 四半期 CSV: 年別JSONの byMonth から集計
async function generateQuarterCsv(guild, storeId, yearlyData) {
  if (!yearlyData || !yearlyData.byMonth) return;

  const guildName = guild.name;
  const storeName = storeId || '';
  const year = yearlyData.year || '';

  const quarters = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const [monthKey, amount] of Object.entries(yearlyData.byMonth)) {
    const mMatch = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!mMatch) continue;
    const mm = Number(mMatch[2]);
    let q = null;
    if (mm >= 1 && mm <= 3) q = 'Q1';
    else if (mm >= 4 && mm <= 6) q = 'Q2';
    else if (mm >= 7 && mm <= 9) q = 'Q3';
    else if (mm >= 10 && mm <= 12) q = 'Q4';
    if (!q) continue;

    quarters[q] += Number(amount) || 0;
  }

  for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
    const total = quarters[q];
    if (!total) continue;

    const header = ['ギルド名', '店舗名', '年', '四半期', '承認済み合計'];
    const rows = [
      header,
      [guildName, storeName, year, q, total],
    ];

    const objectPath = `GCS/${guild.id}/keihi/csv/${storeName}/${year}${q}.csv`;
    await writeCsv(objectPath, rows);
  }
}

async function generateKeihiCsvFiles(guild, storeId, dailyData, monthlyData, yearlyData) {
  try {
    if (dailyData) await generateDailyCsv(guild, storeId, dailyData);
    if (monthlyData) await generateMonthlyCsv(guild, storeId, monthlyData);
    if (yearlyData) {
      await generateYearlyCsv(guild, storeId, yearlyData);
      await generateQuarterCsv(guild, storeId, yearlyData);
    }
  } catch (err) {
    logger.error('[keihiCsvGenerator] CSV生成中にエラーが発生しました:', err);
  }
}

module.exports = {
  generateDailyCsv,
  generateMonthlyCsv,
  generateYearlyCsv,
  generateQuarterCsv,
  generateKeihiCsvFiles,
};
