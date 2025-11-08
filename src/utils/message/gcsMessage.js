// src/utils/message/gcsMessage.js
const { saveJSON, readJSON } = require('../gcs');
const dayjs = require('dayjs');

/**
 * メッセージ設定を保存
 */
async function saveMessageConfig(guildId, data) {
  const path = `GCS/${guildId}/message/config.json`;
  await saveJSON(path, data);
}

/**
 * メッセージテンプレートを保存
 */
async function saveTemplateList(guildId, data) {
  const path = `GCS/${guildId}/message/テンプレート一覧.json`;
  await saveJSON(path, data);
}

/**
 * 送信履歴を保存
 */
async function saveMessageHistory(guildId, data) {
  const d = dayjs();
  const path = `GCS/${guildId}/message/履歴/${d.format('YYYYMMDD')}.json`;
  await saveJSON(path, data);
}

module.exports = { saveMessageConfig, saveTemplateList, saveMessageHistory };

