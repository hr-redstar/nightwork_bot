/**
 * src/utils/errorHandlers.js
 * 統一エラーハンドリング (Context-Aware)
 */

const logger = require('./logger');
const { MessageFlags } = require('discord.js');
const crypto = require('crypto');

/**
 * バリデーションエラー用クラス (ユーザー入力ミス等の通知用)
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.isValidationError = true;
  }
}

/**
 * インタラクションエラーの統一処理
 * @param {import('discord.js').Interaction} interaction 
 * @param {Error|any} error 
 * @param {Object} options - オプション設定
 * @param {boolean} [options.ephemeral=true] - エフェメラルメッセージ
 * @param {string|null} [options.userMessage=null] - ユーザー向けメッセージ
 * @param {string} [options.logLevel='error'] - ログレベル
 */
async function handleInteractionError(interaction, error, options = {}) {
  const {
    ephemeral = true,
    logLevel = 'error'
  } = options;

  // Trace ID 生成 (short UUID)
  const traceId = crypto.randomUUID().split('-')[0];
  const errorCode = error?.code || 'N/A';
  const isValidation = error?.isValidationError || error?.name === 'ValidationError';

  // ログ出力 (バリデーションエラーは warn 以下で十分なことが多い)
  const actualLogLevel = isValidation ? 'warn' : logLevel;
  const logMsg = `[Req:${traceId}] [InteractionError] ID:${interaction?.id} Code:${errorCode} CustomId:${interaction?.customId || 'unknown'}: ${error?.message || error}`;

  if (actualLogLevel === 'error') {
    logger.error(logMsg, error);
  } else {
    logger.warn(logMsg);
  }

  // インタラクションが死んでいる（リプライ不可能）なら終了
  // @ts-ignore
  if (!interaction || (typeof interaction.isRepliable === 'function' && !interaction.isRepliable())) {
    return;
  }

  // ユーザーへのエラーメッセージ
  let content = options.userMessage;
  if (!content) {
    if (isValidation) {
      content = `❌ **入力エラー**: ${error.message}`;
    } else {
      content = `⚠️ 処理中にエラーが発生しました。管理者に連絡してください。\n(TraceID: ${traceId})`;
    }
  } else {
    content = `${content}\n(TraceID: ${traceId})`;
  }

  try {
    const payload = {
      content,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    };

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: content,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    } else {
      await interaction.followUp({
        content: content,
        flags: ephemeral ? MessageFlags.Ephemeral : undefined,
      });
    }
  } catch (replyError) {
    logger.debug(`[errorHandlers] Final fallback failed (TraceID: ${traceId}):`, replyError.message);
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
  ValidationError,
};