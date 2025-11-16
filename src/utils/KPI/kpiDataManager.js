/**
 * kpiDataManager.js
 * KPI関連のデータ永続化を管理
 */
const { readJson, writeJson } = require('../gcs');

const getGuildBasePath = (guildId) => `GCS/${guildId}/kpi`;
const getStoreBasePath = (guildId, storeName) => `${getGuildBasePath(guildId)}/${storeName}`;

/* -------------------------------------------------------------------------- */
/* 📌 メイン設定 (config.json) */
/* -------------------------------------------------------------------------- */

/**
 * ギルド全体のKPI設定を取得
 * @param {string} guildId
 */
async function getKpiConfig(guildId) {
  const path = `${getGuildBasePath(guildId)}/config.json`;
  return (await readJson(path)) || { installedPanels: {}, approvalRoles: [] };
}

/**
 * ギルド全体のKPI設定を保存
 * @param {string} guildId
 * @param {object} data
 */
async function saveKpiConfig(guildId, data) {
  const path = `${getGuildBasePath(guildId)}/config.json`;
  await writeJson(path, data);
}

/* -------------------------------------------------------------------------- */
/* 📌 店舗別設定 (config.json) */
/* -------------------------------------------------------------------------- */

/**
 * 店舗別のKPI設定（申請役職など）を取得
 * @param {string} guildId
 * @param {string} storeName
 */
async function getStoreKpiConfig(guildId, storeName) {
  const path = `${getStoreBasePath(guildId, storeName)}/config.json`;
  return (await readJson(path)) || { applicantRoles: [] };
}

/**
 * 店舗別のKPI設定を保存
 * @param {string} guildId
 * @param {string} storeName
 * @param {object} data
 */
async function saveStoreKpiConfig(guildId, storeName, data) {
  const path = `${getStoreBasePath(guildId, storeName)}/config.json`;
  await writeJson(path, data);
}

/* -------------------------------------------------------------------------- */
/* 📌 目標値・申請データ */
/* -------------------------------------------------------------------------- */
// (今後の実装で追加)
// async function getKpiTarget(guildId, storeName, year, month) { ... }
// async function saveKpiTarget(guildId, storeName, year, month, data) { ... }
// async function getKpiSubmission(guildId, storeName, date) { ... }
// async function saveKpiSubmission(guildId, storeName, date, data) { ... }


/* -------------------------------------------------------------------------- */
/* 📦 エクスポート */
/* -------------------------------------------------------------------------- */
module.exports = {
  getKpiConfig,
  saveKpiConfig,
  getStoreKpiConfig,
  saveStoreKpiConfig,
};