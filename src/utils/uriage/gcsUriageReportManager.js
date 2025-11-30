// src/utils/uriage/gcsUriageReportManager.js
// ----------------------------------------------------
// 売上報告1件分のメタ情報を GCS / ローカルに保存・読み込み
//
// パス: GCS/<guildId>/uriage/report/<threadId>_<messageId>.json
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

function reportMetaPath(guildId, threadId, messageId) {
  return `${guildId}/uriage/report/${threadId}_${messageId}.json`;
}

/**
 * デフォルト構造
 */
function createDefaultMeta() {
  return {
    storeName: '',
    date: '', // "2025-11-29" 等
    total: 0,
    genkin: 0,
    card: 0,
    urikake: 0,
    keihi: 0,
    zankin: 0,
    inputUserId: '',
    inputAt: '',
    lastUpdateAt: '',
    status: 'pending', // 'pending' | 'approved' | 'deleted'
    summaryChannelId: '',
    summaryMessageId: '',
    approvedBy: '',
    approvedAt: '',
    deletedBy: '',
    deletedAt: '',
  };
}

async function loadReportMeta(guildId, threadId, messageId) {
  try {
    const data = (await readJSON(reportMetaPath(guildId, threadId, messageId))) || {};
    return {
      ...createDefaultMeta(),
      ...data,
    };
  } catch (err) {
    logger.error('[gcsUriageReport] メタ読み込みエラー:', guildId, threadId, messageId, err);
    return createDefaultMeta();
  }
}

async function saveReportMeta(guildId, threadId, messageId, meta) {
  try {
    const merged = {
      ...createDefaultMeta(),
      ...(meta || {}),
      lastUpdateAt: new Date().toISOString(),
    };
    await saveJSON(reportMetaPath(guildId, threadId, messageId), merged);
    return merged;
  } catch (err) {
    logger.error('[gcsUriageReport] メタ保存エラー:', guildId, threadId, messageId, err);
    throw err;
  }
}

module.exports = {
  reportMetaPath,
  loadReportMeta,
  saveReportMeta,
};