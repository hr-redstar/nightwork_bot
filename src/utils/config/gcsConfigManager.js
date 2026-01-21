// src/utils/config/gcsConfigManager.js
// ----------------------------------------------------
// ギルド単位の config.json の読み書き
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

const CURRENT_CONFIG_VERSION = 1;

function configPath(guildId) {
  return `${guildId}/config/config.json`;
}

function defaultGuildConfig() {
  return {
    globalLogChannel: null,
    adminLogChannel: null,
    commandLogThread: null,
    settingLogThread: null,
    slackWebhookUrl: null,
    commandExecutorRoleId: null,
    configPanelMessageId: null,
    configMetadata: {
      version: CURRENT_CONFIG_VERSION,
      updatedAt: new Date().toISOString(),
    },
  };
}

const STRING_FIELDS = [
  'globalLogChannel',
  'adminLogChannel',
  'commandLogThread',
  'settingLogThread',
  'slackWebhookUrl',
  'commandExecutorRoleId',
  'configPanelMessageId',
];

function ensureString(value) {
  return typeof value === 'string' ? value : null;
}

function buildConfigMetadata(rawMetadata = {}) {
  const version =
    typeof rawMetadata?.version === 'number'
      ? rawMetadata.version
      : CURRENT_CONFIG_VERSION;
  return {
    version: Math.max(version, CURRENT_CONFIG_VERSION),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeGuildConfig(raw) {
  const data = raw || {};
  const merged = {
    ...defaultGuildConfig(),
    ...data,
  };

  // Normalize keys for backward compatibility. The `...Id` version is the canonical one.
  merged.globalLogChannelId = ensureString(data.globalLogChannelId || data.globalLogChannel);
  merged.adminLogChannelId = ensureString(data.adminLogChannelId || data.adminLogChannel);
  merged.commandLogThreadId = ensureString(data.commandLogThreadId || data.commandLogThread);
  merged.settingLogThreadId = ensureString(data.settingLogThreadId || data.settingLogThread);

  for (const key of STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(merged, key)) {
      merged[key] = ensureString(merged[key]);
    }
  }

  merged.configMetadata = buildConfigMetadata(data.configMetadata);

  return merged;
}

// --------------------------------------------------
// 設定取得
// --------------------------------------------------
async function getGuildConfig(guildId) {
  const path = configPath(guildId);

  try {
    const data = (await readJSON(path)) || {};
    return normalizeGuildConfig(data);
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
    const normalized = normalizeGuildConfig(merged);

    await saveJSON(path, normalized);
    return normalized;
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
    const normalized = normalizeGuildConfig(config);
    await saveJSON(path, normalized);
  } catch (err) {
    logger.error('❌ config.json の保存エラー(setGuildConfig):', err);
  }
}

async function updateGuildConfig(guildId, patch) {
  return saveGuildConfig(guildId, patch);
}

module.exports = {
  configPath,
  getGuildConfig,
  saveGuildConfig,
  setGuildConfig, // 旧コード用のエイリアス
  updateGuildConfig,
};
