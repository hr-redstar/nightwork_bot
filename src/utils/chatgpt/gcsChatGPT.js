// src/utils/chatgpt/gcsChatGPT.js
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

/**
 * ChatGPT設定を保存
 */
async function saveChatGPTConfig(guildId, data) {
  const path = `GCS/${guildId}/chatgpt/config.json`;
  await saveJSON(path, data);
}

/**
 * 今日のChatGPT設定を保存
 */
async function saveTodaySetting(guildId, data) {
  const path = `GCS/${guildId}/chatgpt/今日のchatgpt設定.json`;
  await saveJSON(path, data);
}

/**
 * 回答チャンネル設定を保存
 */
async function saveAnswerChannel(guildId, data) {
  const path = `GCS/${guildId}/chatgpt/回答チャンネル設定.json`;
  await saveJSON(path, data);
}

/**
 * 月ごとの使用率を保存
 */
async function saveUsageRate(guildId, data) {
  const d = dayjs();
  const path = `GCS/${guildId}/chatgpt/使用率/${d.format('YYYYMM')}.json`;
  await saveJSON(path, data);
}

module.exports = { saveChatGPTConfig, saveTodaySetting, saveAnswerChannel, saveUsageRate };

