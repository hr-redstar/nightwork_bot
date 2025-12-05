// src/utils/keihi/keihiStoreConfigManager.js
// ----------------------------------------------------
// 店舗ごとの経費設定
//   - パス: GCS/{guildId}/keihi/{storeId}/config.json
//   - 経費申請パネルのチャンネル / メッセージ
//   - 閲覧役職 / 申請役職 / 経費項目 など
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

function buildStoreConfigPath(guildId, storeId) {
  return `GCS/${guildId}/keihi/${storeId}/config.json`;
}

function createDefaultStoreConfig(storeId) {
  return {
    storeId,
    channelId: null,      // 経費申請パネルを設置したテキストチャンネル
    messageId: null,      // 経費申請パネルのメッセージID

    // ロールID直接指定
    viewRoleIds: [],      // スレッド閲覧役職（ロールID）
    requestRoleIds: [],   // 経費申請役職（ロールID）

    // 役職ID（店舗_役職_ロール.json の positionId）経由
    viewRolePositionIds: [],
    requestRolePositionIds: [],

    // 経費項目
    // 例: ["・① 広告費", { name: "・② 印刷費", code: "PRINT" }]
    items: [],

    lastUpdated: null,
  };
}

function normalizeStoreConfig(raw, storeId) {
  const base = createDefaultStoreConfig(storeId);
  const cfg = { ...base, ...(raw || {}) };

  cfg.storeId = storeId;

  if (!Array.isArray(cfg.viewRoleIds)) cfg.viewRoleIds = [];
  if (!Array.isArray(cfg.requestRoleIds)) cfg.requestRoleIds = [];
  if (!Array.isArray(cfg.viewRolePositionIds)) cfg.viewRolePositionIds = [];
  if (!Array.isArray(cfg.requestRolePositionIds)) cfg.requestRolePositionIds = [];
  if (!Array.isArray(cfg.items)) cfg.items = [];

  return cfg;
}

/**
 * 店舗ごとの経費設定を読み込み
 * @param {string} guildId
 * @param {string} storeId
 */
async function loadKeihiStoreConfig(guildId, storeId) {
  const objectPath = buildStoreConfigPath(guildId, storeId);
  try {
    const raw = await readJSON(objectPath);
    return normalizeStoreConfig(raw, storeId);
  } catch (err) {
    logger.warn(
      `[keihiStoreConfig] 読み込み失敗 guildId=${guildId}, storeId=${storeId}, path=${objectPath}`,
      err,
    );
    return createDefaultStoreConfig(storeId);
  }
}

/**
 * 店舗ごとの経費設定を保存
 * @param {string} guildId
 * @param {string} storeId
 * @param {object} config
 */
async function saveKeihiStoreConfig(guildId, storeId, config) {
  const objectPath = buildStoreConfigPath(guildId, storeId);
  const cfg = normalizeStoreConfig(config, storeId);
  cfg.lastUpdated = new Date().toISOString();

  await saveJSON(objectPath, cfg);
  return cfg;
}

module.exports = {
  buildStoreConfigPath,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
};
