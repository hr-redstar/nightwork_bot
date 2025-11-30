// src/utils/chat_gpt/chatGptThreadLogManager.js
// ----------------------------------------------------
// ChatGPT会話スレッド専用のログ蓄積・読み込み・要約管理
//   <guildId>/chatgpt/ログ蓄積/<threadId>.json
// ----------------------------------------------------

const gcs = require('../gcs');
const logger = require('../logger');

function threadLogPath(guildId, threadId) {
  return `${guildId}/chatgpt/ログ蓄積/${threadId}.json`;
}

// デフォルト構造
function createDefaultThreadLog(threadId, channelId, ownerId, basePrompt) {
  const now = new Date().toISOString();
  return {
    threadId,
    channelId,
    ownerId,
    createdAt: now,
    basePrompt: basePrompt || '',
    summary: '',
    messages: [],
  };
}

// 初期化（存在しなければ新規作成）
async function initThreadLog(guildId, threadId, channelId, ownerId, basePrompt) {
  let log = null;
  try {
    log = (await gcs.readJSON(threadLogPath(guildId, threadId))) || null;
  } catch {
    log = null;
  }

  if (!log) {
    log = createDefaultThreadLog(threadId, channelId, ownerId, basePrompt);
  } else {
    if (basePrompt) log.basePrompt = basePrompt;
  }

  await gcs.saveJSON(threadLogPath(guildId, threadId), log);
  return log;
}

// 読み込み
async function loadThreadLog(guildId, threadId) {
  try {
    const data = (await gcs.readJSON(threadLogPath(guildId, threadId))) || null;
    return data;
  } catch (err) {
    logger.warn(`[chatGptThreadLog] 読み込み失敗: ${guildId}/${threadId}`, err);
    return null;
  }
}

// 保存
async function saveThreadLog(guildId, threadId, log) {
  try {
    await gcs.saveJSON(threadLogPath(guildId, threadId), log);
    return true;
  } catch (err) {
    logger.error(`[chatGptThreadLog] 保存失敗: ${guildId}/${threadId}`, err);
    throw err;
  }
}

// 1件追加（append）
async function appendThreadMessage(
  guildId,
  {
    threadId,
    channelId,
    ownerId,
    basePrompt,
    role, // 'user' | 'assistant' | 'system'
    authorId,
    content,
    timestamp,
    messageId,
  }
) {
  let log = await loadThreadLog(guildId, threadId);

  if (!log) {
    log = createDefaultThreadLog(threadId, channelId, ownerId, basePrompt);
  }

  if (!log.basePrompt && basePrompt) {
    log.basePrompt = basePrompt;
  }

  log.messages.push({
    role,
    authorId: authorId || null,
    content,
    timestamp: timestamp || new Date().toISOString(),
    messageId: messageId || null,
  });

  await saveThreadLog(guildId, threadId, log);
  return log;
}

/**
 * スレッド用コンテキストを生成（要約 + 直近N件）
 *
 * @param {string} guildId
 * @param {string} threadId
 * @param {number} recentLimit
 * @returns {Promise<{ basePrompt: string, summary: string, recentMessages: Array } | null>}
 */
async function buildThreadContext(guildId, threadId, recentLimit = 20) {
  const log = await loadThreadLog(guildId, threadId);
  if (!log) return null;

  const recentMessages = log.messages.slice(-recentLimit);

  return {
    basePrompt: log.basePrompt || '',
    summary: log.summary || '',
    recentMessages,
  };
}

/**
 * 要約対象抽出
 */
function extractForSummarize(log, threshold = 200) {
  if (!log || !Array.isArray(log.messages)) {
    return { needSummarize: false, targetMessages: [], remainMessages: [] };
  }

  if (log.messages.length <= threshold) {
    return { needSummarize: false, targetMessages: [], remainMessages: log.messages };
  }

  const overflow = log.messages.length - threshold;
  const targetMessages = log.messages.slice(0, overflow + 50);
  const remainMessages = log.messages.slice(overflow + 50);

  return {
    needSummarize: true,
    targetMessages,
    remainMessages,
  };
}

/**
 * 要約を summary に反映
 *
 * @param {string} guildId
 * @param {string} threadId
 * @param {(oldSummary: string, targetMessages: Array) => Promise<string>} summarizeFn
 */
async function updateSummaryIfNeeded(guildId, threadId, summarizeFn, threshold = 200) {
  const log = await loadThreadLog(guildId, threadId);
  if (!log) return null;

  const { needSummarize, targetMessages, remainMessages } = extractForSummarize(log, threshold);
  if (!needSummarize) return log;

  const newSummary = await summarizeFn(log.summary || '', targetMessages);

  log.summary = newSummary;
  log.messages = remainMessages;

  await saveThreadLog(guildId, threadId, log);
  return log;
}

module.exports = {
  threadLogPath,
  initThreadLog,
  loadThreadLog,
  saveThreadLog,
  appendThreadMessage,
  buildThreadContext,
  updateSummaryIfNeeded,
};