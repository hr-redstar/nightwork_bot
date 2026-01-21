// src/utils/errorHandlers.js
// ----------------------------------------------------
// 統一エラーハンドリング
// ----------------------------------------------------

const logger = require('./logger');
const { MessageFlags } = require('discord.js');

/**
 * インタラクションエラーの統一処理
 * @param {import('discord.js').Interaction} interaction 
 * @param {Error} error 
 * @param {Object} options - オプション設定
 * @param {boolean} options.ephemeral - エフェメラルメッセージ（デフォルト: true）
 * @param {string|null} options.userMessage - ユーザー向けメッセージ（nullならデフォルト）
 * @param {string} options.logLevel - ログレベル（デフォルト: 'error'）
 */
async function handleInteractionError(interaction, error, options = {}) {
  const {
    ephemeral = true,
    userMessage = null,
    logLevel = 'error'
  } = options;

  // ログ出力（スタックトレース含む）
  if (logLevel === 'error') {
    logger.error(error);
  } else if (logLevel === 'warn') {
    logger.warn(error);
  } else {
    logger.info(error);
  }

  // インタラクションが既に応答済みの場合は何もしない
  if (!interaction || interaction.replied || interaction.deferred) {
    return;
  }

  // ユーザーへのエラーメッセージ
  const content = userMessage || '⚠️ 処理中にエラーが発生しました。管理者に連絡してください。';

  try {
    await interaction.reply({
      content,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
  } catch (replyError) {
    // reply自体が失敗した場合もログに記録
    logger.error('[errorHandlers] Failed to send error message:', replyError);
  }
}

/**
 * コマンドエラーの統一処理
 * @param {import('discord.js').CommandInteraction} interaction 
 * @param {Error} error 
 * @param {Object} options 
 */
async function handleCommandError(interaction, error, options = {}) {
  // コマンドエラーは基本的にインタラクションエラーと同じ処理
  return handleInteractionError(interaction, error, {
    ephemeral: true,
    ...options
  });
}

/**
 * Promise未処理拒否のグローバルハンドラー
 */
function setupGlobalErrorHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[UnhandledRejection]', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('[UncaughtException]', error);
    // 致命的なエラーの場合はプロセス終了を検討
    // process.exit(1);
  });
}

module.exports = {
  handleInteractionError,
  handleCommandError,
  setupGlobalErrorHandlers,
};