/**
 * src/utils/errorHandlers.js
 * 統一エラーハンドリング (Context-Aware)
 */

const logger = require('./logger');
const { MessageFlags } = require('discord.js');
const crypto = require('crypto');

/**
 * インタラクションエラーの統一処理
 * @param {import('discord.js').Interaction} interaction 
 * @param {Error} error 
 * @param {Object} options - オプション設定
 * @param {boolean} [options.ephemeral=true] - エフェメラルメッセージ
 * @param {string|null} [options.userMessage=null] - ユーザー向けメッセージ
 * @param {string} [options.logLevel='error'] - ログレベル
 */
async function handleInteractionError(interaction, error, options = {}) {
  const {
    ephemeral = true,
    userMessage = null,
    logLevel = 'error'
  } = options;

  // Trace ID 生成 (short UUID)
  const traceId = crypto.randomUUID().split('-')[0];

  // ログ出力 (logger は AsyncLocalStorage により context 情報を自動で付与する)
  const logMsg = `[Req:${traceId}] [InteractionError] ${interaction?.customId || 'unknown'}: ${error.message}`;

  if (logLevel === 'error') {
    logger.error(logMsg, error);
  } else if (logLevel === 'warn') {
    logger.warn(logMsg);
  } else {
    logger.info(logMsg);
  }

  // インタラクションが既に応答済みで、かつデフェアドでもない場合は何もしない (またはログのみ)
  if (!interaction || (interaction.replied && !interaction.deferred)) {
    return;
  }

  // ユーザーへのエラーメッセージ
  const content = userMessage 
    ? `${userMessage}\n(TraceID: ${traceId})`
    : `⚠️ 処理中にエラーが発生しました。管理者に連絡してください。\n(TraceID: ${traceId})`;

  try {
    const payload = {
      content,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (replyError) {
    // reply自体が失敗した場合もログに記録 (デバッグ情報として)
    logger.debug(`[errorHandlers] Failed to send error reply (TraceID: ${traceId}):`, replyError.message);
  }
}

/**
 * コマンドエラーの統一処理
 */
async function handleCommandError(interaction, error, options = {}) {
  return handleInteractionError(interaction, error, {
    ephemeral: true,
    ...options
  });
}

/**
 * Promise未処理拒否のグローバルハンドラー
 * ※ logger.js 側でも設定しているが、詳細なログが必要な場合はこちらで拡張
 */
function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[UnhandledRejection Global]', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('[UncaughtException Global]', error);
    // 致命的なエラーでも即終了させず、ロギングを優先
  });
}

module.exports = {
  handleInteractionError,
  handleCommandError,
  setupGlobalErrorHandlers,
};