// src/handlers/uriage/report/panel.js
// ----------------------------------------------------
// 売上報告サマリパネル（拡張用スケルトン）
//   例: 店舗ごとの直近の売上報告一覧を出したいときに使う想定
// ----------------------------------------------------

/**
 * 売上報告のサマリパネルを更新する（未実装）
 * @param {import('discord.js').Message} message
 * @param {Object} [options]
 */
async function updateUriageReportSummaryPanel(message, options = {}) {
  // TODO: 必要になったら、日次データ(GCS)から集計してEmbedを組み立てる
  return message;
}

module.exports = {
  updateUriageReportSummaryPanel,
};