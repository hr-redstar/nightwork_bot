// src/utils/chatgpt/gcsChatGptManager.js
// ----------------------------------------------------
// ChatGPT設定を GCS/ローカル に保存・読み込みするヘルパー
//
// ・共通設定            : GCS/<guildId>/chatgpt/config.json
// ・今日のchatgpt設定  : GCS/<guildId>/chatgpt/今日のchatgpt設定.json
// ・回答チャンネル設定  : GCS/<guildId>/chatgpt/回答チャンネル設定.json
// ・使用率(年月別)      : GCS/<guildId>/chatgpt/使用率/YYYYMM.json
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// ==============================
// パス生成
// ==============================

function baseDir(guildId) {
  return `GCS/${guildId}/chatgpt`;
}

// 共通config
function chatGptConfigPath(guildId) {
  return `${baseDir(guildId)}/config.json`;
}

// 今日のchatgpt設定
function todaySettingPath(guildId) {
  return `${baseDir(guildId)}/今日のchatgpt設定.json`;
}

// 回答チャンネル設定
function answerChannelPath(guildId) {
  return `${baseDir(guildId)}/回答チャンネル設定.json`;
}

// 使用率 (年月) : yearMonth は "202511" など
function usagePath(guildId, yearMonth) {
  return `${baseDir(guildId)}/使用率/${yearMonth}.json`;
}

// ==============================
// デフォルト構造
// ==============================

// 共通config（今は薄めに。今後全体設定を足す想定）
function createDefaultConfig() {
  return {
    // 例: defaultModel: 'gpt-5.1-mini',
  };
}

// 今日のchatgpt設定
// [{ storeId, storeName, channelId, apiKey, model, prompt, toneLevel, maxTokens }]
function createDefaultTodaySettings() {
  return [];
}

// 回答チャンネル設定
// [{ storeId, storeName, channelId, apiKey }]
function createDefaultAnswerChannels() {
  return [];
}

// 使用率
// { apiKeyHash(orId): { totalTokens: number, totalCost: number, calls: number } }
function createDefaultUsage() {
  return {};
}

// ==============================
// 共通config 読み込み・保存
// ==============================

async function loadChatGptConfig(guildId) {
  try {
    const data = (await readJSON(chatGptConfigPath(guildId))) || {};
    return {
      ...createDefaultConfig(),
      ...data,
    };
  } catch (err) {
    logger.error(`[chatgpt/config] 読み込みエラー: ${guildId}`, err);
    return createDefaultConfig();
  }
}

async function saveChatGptConfig(guildId, config) {
  try {
    await saveJSON(chatGptConfigPath(guildId), config);
    return true;
  } catch (err) {
    logger.error(`[chatgpt/config] 保存エラー: ${guildId}`, err);
    throw err;
  }
}

// ==============================
// 今日のchatgpt設定 読み込み・保存
// ==============================

async function loadTodaySettings(guildId) {
  try {
    const data = (await readJSON(todaySettingPath(guildId))) || [];
    return Array.isArray(data) ? data : createDefaultTodaySettings();
  } catch (err) {
    logger.error(`[chatgpt/今日のchatgpt設定] 読み込みエラー: ${guildId}`, err);
    return createDefaultTodaySettings();
  }
}

async function saveTodaySettings(guildId, settings) {
  try {
    await saveJSON(todaySettingPath(guildId), settings || []);
    return true;
  } catch (err) {
    logger.error(`[chatgpt/今日のchatgpt設定] 保存エラー: ${guildId}`, err);
    throw err;
  }
}

// ==============================
// 回答チャンネル設定 読み込み・保存
// ==============================

async function loadAnswerChannels(guildId) {
  try {
    const data = (await readJSON(answerChannelPath(guildId))) || [];
    return Array.isArray(data) ? data : createDefaultAnswerChannels();
  } catch (err) {
    logger.error(`[chatgpt/回答チャンネル設定] 読み込みエラー: ${guildId}`, err);
    return createDefaultAnswerChannels();
  }
}

async function saveAnswerChannels(guildId, channels) {
  try {
    await saveJSON(answerChannelPath(guildId), channels || []);
    return true;
  } catch (err) {
    logger.error(`[chatgpt/回答チャンネル設定] 保存エラー: ${guildId}`, err);
    throw err;
  }
}

// ==============================
// 使用率 読み込み・保存
// ==============================

// yearMonth: "202511" のような文字列
async function loadUsage(guildId, yearMonth) {
  try {
    const data = (await readJSON(usagePath(guildId, yearMonth))) || {};
    return { ...createDefaultUsage(), ...data };
  } catch (err) {
    logger.error(`[chatgpt/使用率] 読み込みエラー: ${guildId}/${yearMonth}`, err);
    return createDefaultUsage();
  }
}

async function saveUsage(guildId, yearMonth, usage) {
  try {
    await saveJSON(usagePath(guildId, yearMonth), usage || {});
    return true;
  } catch (err) {
    logger.error(`[chatgpt/使用率] 保存エラー: ${guildId}/${yearMonth}`, err);
    throw err;
  }
}

module.exports = {
  // path
  chatGptConfigPath,
  todaySettingPath,
  answerChannelPath,
  usagePath,

  // config
  loadChatGptConfig,
  saveChatGptConfig,

  // 今日のchatgpt設定
  loadTodaySettings,
  saveTodaySettings,

  // 回答チャンネル設定
  loadAnswerChannels,
  saveAnswerChannels,

  // 使用率
  loadUsage,
  saveUsage,
};
