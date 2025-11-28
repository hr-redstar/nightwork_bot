// src/utils/chat_gpt/gcsChatGptConfigManager.js
// ----------------------------------------------------
// ChatGPT設定 (今日のchat gpt / 回答チャンネル設定) を
// GCS またはローカルに保存・読み込みするヘルパー
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

// -----------------------------------------
// 保存先パス生成
// -----------------------------------------
function chatGptConfigPath(guildId) {
  return `GCS/${guildId}/chat_gpt/config.json`;
}

// -----------------------------------------
// デフォルト構造
// -----------------------------------------
function createDefaultConfig() {
  return {
    // 今日のchat gpt設定一覧
    // [{ storeId, storeName, channelId, apiKey, model, prompt, toneLevel, maxTokens }]
    todaySettings: [],

    // 回答チャンネル一覧
    // [{ storeId, storeName, channelId, apiKey }]
    answerChannels: [],
  };
}

// -----------------------------------------
// 読み込み
// -----------------------------------------
async function loadChatGptConfig(guildId) {
  try {
    const data = (await readJSON(chatGptConfigPath(guildId))) || {};
    return {
      ...createDefaultConfig(),
      ...data,
    };
  } catch (err) {
    logger.error(`[gcsChatGptConfig] 読み込みエラー: ${guildId}`, err);
    return createDefaultConfig();
  }
}

// -----------------------------------------
// 保存
// -----------------------------------------
async function saveChatGptConfig(guildId, config) {
  const path = chatGptConfigPath(guildId);
  try {
    await saveJSON(path, config);
    return true;
  } catch (err) {
    logger.error(`[gcsChatGptConfig] 保存エラー: ${guildId}`, err);
    throw err;
  }
}

module.exports = {
  loadChatGptConfig,
  saveChatGptConfig,
};
