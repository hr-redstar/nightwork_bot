// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費の「ギルド全体設定」管理
//   - パス: GCS/{guildId}/keihi/config.json
//   - 承認役職（ロールID / 役職ID）
//   - 設定パネル（/設定経費）の場所
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

function buildConfigPath(guildId) {
  return `GCS/${guildId}/keihi/config.json`;
}

function createDefaultConfig() {
  return {
    // グローバル承認ロール（ロールID）
    approverRoleIds: [],

    // グローバル承認役職（positionId）
    approverPositionIds: [],

    // 設定パネル (/設定経費) のメッセージ場所
    configPanel: null, // { channelId, messageId }

    // 旧フォーマット互換
    panelMap: undefined,
    panelMessageMap: undefined,

    // パネル一覧（storeId -> { channelId, messageId }）
    panels: {},

    lastUpdated: null,
  };
}

function normalizeConfig(raw) {
  const base = createDefaultConfig();
  const cfg = { ...base, ...(raw || {}) };

  if (!Array.isArray(cfg.approverRoleIds)) cfg.approverRoleIds = [];
  if (!Array.isArray(cfg.approverPositionIds)) cfg.approverPositionIds = [];

  if (!cfg.panels || typeof cfg.panels !== 'object') cfg.panels = {};
  return cfg;
}

/**
 * 古い panelMap / panelMessageMap を panels に移行
 */
function migratePanels(cfg) {
  const panelMap = cfg.panelMap || {};
  const panelMessageMap = cfg.panelMessageMap || {};

  if (!panelMap || typeof panelMap !== 'object') return cfg;

  if (!cfg.panels || typeof cfg.panels !== 'object') {
    cfg.panels = {};
  }

  for (const [storeId, channelId] of Object.entries(panelMap)) {
    if (!storeId || !channelId) continue;

    if (!cfg.panels[storeId]) {
      cfg.panels[storeId] = {
        channelId,
        messageId: panelMessageMap[storeId] || null,
      };
    }
  }

  delete cfg.panelMap;
  delete cfg.panelMessageMap;
  return cfg;
}

/**
 * 経費グローバル設定を読み込み
 * @param {string} guildId
 */
async function loadKeihiConfig(guildId) {
  const path = buildConfigPath(guildId);
  try {
    const raw = await readJSON(path);
    const cfg = normalizeConfig(raw);
    return migratePanels(cfg);
  } catch (err) {
    logger.warn('[keihiConfigManager] 読み込み失敗:', err);
    return createDefaultConfig();
  }
}

/**
 * 経費グローバル設定を保存
 * @param {string} guildId
 * @param {object} config
 */
async function saveKeihiConfig(guildId, config) {
  const path = buildConfigPath(guildId);
  const cfg = normalizeConfig(config);
  cfg.lastUpdated = new Date().toISOString();

  await saveJSON(path, cfg);
  return cfg;
}

module.exports = {
  loadKeihiConfig,
  saveKeihiConfig,
};
