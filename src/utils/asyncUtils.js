/**
 * src/utils/asyncUtils.js
 * 非同期処理共通ユーティリティ
 */

const logger = require('./logger');

/**
 * 指数バックオフによるリトライ実行
 * @param {Function} fn - 実行する非同期関数
 * @param {number} [retries=3] - 最大リトライ回数
 * @param {number} [delay=1000] - 初回遅延ミリ秒
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, retries = 3, delay = 1000) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) {
                throw err;
            }
            
            const backoffDelay = delay * Math.pow(2, attempt);
            // logger.warn(`[AsyncUtils] Retry attempt ${attempt + 1}/${retries} after ${backoffDelay}ms: ${err.message}`);
            // シンプルな実装にするため、ログは呼び出し元またはsafeExecuteに任せるか、必要に応じてコメントアウトを解除
            await new Promise(r => setTimeout(r, backoffDelay));
        }
    }
}

/**
 * 非同期処理の安全な実行（共通エラートラッキング付き）
 * @param {Function} fn - 実行する関数
 * @param {Function} [errorHandler] - エラーハンドラー (err) => Promise<void>
 */
async function safeExecute(fn, errorHandler) {
    try {
        await fn();
    } catch (err) {
        if (errorHandler) {
            await errorHandler(err);
        } else {
            // ハンドラーがない場合はログを出して再スロー（または握りつぶすかポリシーによるが、ここではログ出力）
            logger.error('[safeExecute] Unhandled error:', err);
            throw err;
        }
    }
}

/**
 * 指定時間待機
 * @param {number} ms 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    retryWithBackoff,
    safeExecute,
    sleep
};
