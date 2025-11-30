// src/utils/chat_gpt/gcsChatGptManager.js
// ----------------------------------------------------
// ChatGPT設定を GCS/ローカル に保存・読み込みするヘルパー
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// ===== シンプルキャッシュ（TTLなし）=====
const TODAY_SETTINGS_CACHE = new Map(); // key: guildId, value: { data }
const ANSWER_CHANNEL_CACHE = new Map(); // key: guildId, value: { data }

// ==============================
// パス生成
// ==============================

function baseDir(guildId) {
  return `${guildId}/chatgpt`;
}

// 共通config
function chatGptConfigPath(guildId) {
  return `${guildId}/chatgpt/config.json`;
}

// 今日のchatgpt設定
function todaySettingPath(guildId) {
  return `${guildId}/chatgpt/今日のchatgpt設定.json`;
}

// 回答チャンネル設定
function answerChannelPath(guildId) {
  return `${guildId}/chatgpt/回答チャンネル設定.json`;
}

// 使用率 (年月) : yearMonth は "202511" など
function usagePath(guildId, yearMonth) {
  return `${baseDir(guildId)}/使用率/${yearMonth}.json`;
}

// ==============================
// デフォルト構造
// ==============================

// 共通config（今は薄め。必要に応じて項目追加）
function createDefaultConfig() {
  return {
    // 例: defaultModel: 'gpt-4.1-mini',
  };
}

// 今日のchatgpt設定
// [{ storeName, channelId, apiKey, model, prompt, toneLevel, maxTokens, updatedAt, updatedBy }]
function createDefaultTodaySettings() {
  return [];
}

// 回答チャンネル設定
// [{ storeId, storeName, channelId, apiKey, updatedAt, updatedBy }]
function createDefaultAnswerChannels() {
  return [];
}

// 使用率
// { apiKeyHash(orId): { totalTokens, totalCost, calls } }
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
    await saveJSON(chatGptConfigPath(guildId), config || createDefaultConfig());
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
  // キャッシュにあれば即座に返す
  const cached = TODAY_SETTINGS_CACHE.get(guildId);
  if (cached) {
    return cached.data;
  }

  try {
    const data = (await readJSON(todaySettingPath(guildId))) || [];
    const result = Array.isArray(data) ? data : createDefaultTodaySettings(); // この行は変更不要ですが、比較のため残します
    // 読み込んだ結果をキャッシュに記憶
    TODAY_SETTINGS_CACHE.set(guildId, { data: result });
    return result;
  } catch (err) {
    logger.error(`[chatgpt/今日のchatgpt設定] 読み込みエラー: ${guildId}`, err);
    return createDefaultTodaySettings();
  }
}

async function saveTodaySettings(guildId, settings) {
  try {
    const normalized = settings || [];
    await saveJSON(todaySettingPath(guildId), normalized);
    TODAY_SETTINGS_CACHE.set(guildId, { data: normalized });
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
  // キャッシュにあれば即座に返す
  const cached = ANSWER_CHANNEL_CACHE.get(guildId);
  if (cached) {
    return cached.data;
  }

  try {
    const data = (await readJSON(answerChannelPath(guildId))) || [];
    const result = Array.isArray(data) ? data : createDefaultAnswerChannels(); // この行は変更不要ですが、比較のため残します
    // 読み込んだ結果をキャッシュに記憶
    ANSWER_CHANNEL_CACHE.set(guildId, { data: result });
    return result;
  } catch (err) {
    logger.error(`[chatgpt/回答チャンネル設定] 読み込みエラー: ${guildId}`, err);
    return createDefaultAnswerChannels();
  }
}

async function saveAnswerChannels(guildId, channels) {
  try {
    const normalized = channels || [];
    await saveJSON(answerChannelPath(guildId), normalized);
    ANSWER_CHANNEL_CACHE.set(guildId, { data: normalized });
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