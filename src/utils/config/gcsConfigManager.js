// src/utils/config/gcsConfigManager.js
// ----------------------------------------------------
// ギルド単位の config.json の読み書き
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

function configPath(guildId) {
  return `${guildId}/config/config.json`;
}

// デフォルト構造（足りないキーを補完する用）
function defaultGuildConfig() {
  return {
    globalLogChannel: null,
    adminLogChannel: null,
    commandLogThread: null,
    settingLogThread: null,
    slackWebhookUrl: null,
    commandExecutorRoleId: null,
    // 必要ならここに増やしていく
  };
}

// --------------------------------------------------
// 設定取得
// --------------------------------------------------
async function getGuildConfig(guildId) {
  const path = configPath(guildId);

  try {
    const data = (await readJSON(path)) || {};
    // デフォルトとマージして不足キーを埋める
    return {
      ...defaultGuildConfig(),
      ...data,
    };
  } catch (err) {
    logger.error('❌ config.json の取得エラー:', err);
    return defaultGuildConfig();
  }
}

// --------------------------------------------------
// 設定保存（差分マージ版）
// --------------------------------------------------
async function saveGuildConfig(guildId, partialConfig) {
  const path = configPath(guildId);

  try {
    const current = await getGuildConfig(guildId);
    const merged = {
      ...current,
      ...partialConfig,
    };

    await saveJSON(path, merged);
    return merged;
  } catch (err) {
    logger.error('❌ config.json の保存エラー:', err);
  }
}

// --------------------------------------------------
// 互換用：既存コードの setGuildConfig も残しておく
// --------------------------------------------------
async function setGuildConfig(guildId, config) {
  const path = configPath(guildId);

  try {
    await saveJSON(path, config);
  } catch (err) {
    logger.error('❌ config.json の保存エラー(setGuildConfig):', err);
  }
}

module.exports = {
  configPath,
  getGuildConfig,
  saveGuildConfig,
  setGuildConfig, // 旧コード用のエイリアス
};
