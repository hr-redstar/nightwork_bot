// src/utils/uriage/embedLogger.js
// 売上機能向けの簡易ロガー（必要に応じて拡張してください）

const logger = require('../logger');

function info(...args) {
  logger.info('[uriage] ', ...args);
}

function warn(...args) {
  logger.warn('[uriage] ', ...args);
}

function error(...args) {
  logger.error('[uriage] ', ...args);
}

module.exports = { info, warn, error };
