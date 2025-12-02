// src/utils/keihi/keihiCsvExporter.js
// ----------------------------------------------------
// 経費 CSV 出力ヘルパー
//   - 店舗ごとの月次 CSV を生成
//   - 集計元: gcsKeihiManager の日別データ
// ----------------------------------------------------

const {
  loadKeihiDailyData,
} = require('./gcsKeihiManager');

/**
 * CSV用に値をエスケープ
 * - カンマ / ダブルクォート / 改行を含む場合は "..." で囲む
 * @param {any} value
 * @returns {string}
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/\r?\n/g, ' '); // 改行はスペースに潰す

  if (/[",]/.test(s)) {
    // ダブルクォートは "" にエスケープ
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 指定年月の月の日数を返す
 * @param {string|number} yyyy
 * @param {string|number} mm
 * @returns {number}
 */
function getDaysInMonth(yyyy, mm) {
  const y = Number(yyyy);
  const m = Number(mm);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return 31;
  }
  // JS Date: month は 0 始まり。m をそのまま渡して day=0 にすると「前月の末日」になる。
  return new Date(y, m, 0).getDate();
}

/**
 * 店舗ごとの「月次」経費CSVを構築する
 *
 * - 日別ファイルを 1日〜末日 まで順番に読み、
 *   status === 'APPROVED' のレコードを CSV にする。
 * - CSV ヘッダ:
 *   日付, 店舗, 部署, 経費項目, 金額, 備考, 申請者, 承認者, 承認日時, ステータス, LogID
 *
 * @param {string} guildId
 * @param {string} storeId         // 外部IT会社 など
 * @param {string} yearMonth       // "YYYY-MM" 形式
 * @param {{ storeName?: string }} [options]
 * @returns {Promise<{ fileName: string, csv: string }>}
 */
async function buildStoreMonthlyCsv(guildId, storeId, yearMonth, options = {}) {
  const { storeName = storeId } = options;

  const [yyyy, mmRaw] = String(yearMonth).split('-');
  const mm = String(Number(mmRaw || 0)).padStart(2, '0');

  const daysInMonth = getDaysInMonth(yyyy, mm);

  const header = [
    '日付',
    '店舗',
    '部署',
    '経費項目',
    '金額',
    '備考',
    '申請者',
    '承認者',
    '承認日時',
    'ステータス',
    'LogID',
  ];

  const rows = [header];

  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // 日別 JSON 読み込み
    // 形式は updateKeihiStatsOnApprove で保存したものを想定
    const dailyData = await loadKeihiDailyData(guildId, storeId, dateStr);
    if (!dailyData || !Array.isArray(dailyData.requests)) continue;

    for (const r of dailyData.requests) {
      if (r.status !== 'APPROVED') continue;

      // ★★ ここポイント：IDではなく「Name系のみ」をCSVに使用
      const requesterLabel = r.requesterName || ''; // なければ空欄
      const approvedByLabel = r.approvedByName || '';

      rows.push([
        dateStr,
        storeName,
        r.department || '',
        r.item || '',
        r.amount != null ? String(r.amount) : '', // 金額は数値なのでそのまま
        r.note || '', // 備考
        requesterLabel, // 申請者名
        approvedByLabel, // 承認者名
        r.approvedAt || '',     // ISO文字列
        r.status || '',
        r.logId || '',
      ]);
    }
  }

  const csv = rows
    .map((cols) => cols.map(escapeCsv).join(','))
    .join('\n');

  const safeStore = String(storeId).replace(/[\\/:*?"<>|]/g, '_'); // ファイル名用に簡易サニタイズ
  const fileName = `${yyyy}-${mm}_${safeStore}_経費申請.csv`;

  return { fileName, csv };
}

module.exports = {
  buildStoreMonthlyCsv,
};
