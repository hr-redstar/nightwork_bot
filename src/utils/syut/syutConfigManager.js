/**
 * 出退勤設定・記録管理ユーティリティ
 * 保存場所: GCS/ギルドID/syut/
 */

const { readJSON, saveJSON } = require('../gcs');

/**
 * ベースディレクトリ
 */
function getBasePath(guildId) {
  return `GCS/${guildId}/syut`;
}

/* -------------------------------------------------------------------------- */
/* 🧩 config.json 管理 */
/* -------------------------------------------------------------------------- */

/**
 * 出退勤設定（パネル設定など）取得
 */
async function getSyutConfig(guildId) {
  const filePath = `${getBasePath(guildId)}/config.json`;
  return (await readJSON(filePath)) || {
    castPanelList: {},
    kurofukuPanelList: {},
    lastUpdated: null,
  };
}

/**
 * 出退勤設定保存
 */
async function saveSyutConfig(guildId, data) {
  const filePath = `${getBasePath(guildId)}/config.json`;
  data.lastUpdated = new Date().toISOString();
  await saveJSON(filePath, data);
}

/* -------------------------------------------------------------------------- */
/* 📅 出退勤 日次／月次／年次データ管理 */
/* -------------------------------------------------------------------------- */

/**
 * 日次データ取得
 */
async function getDailySyuttaikin(guildId, storeName, date) {
  const [year, month, day] = date.split('-');
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${month}/${day}/${year}${month}${day}.json`;
  return (await readJSON(filePath)) || { cast: [], kurofuku: [], createdAt: null };
}

/**
 * 日次データ保存
 */
async function saveDailySyuttaikin(guildId, storeName, date, data) {
  const [year, month, day] = date.split('-');
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${month}/${day}/${year}${month}${day}.json`;
  data.createdAt = new Date().toISOString();
  await saveJSON(filePath, data);
}

/**
 * 月次データ取得
 */
async function getMonthlySyuttaikin(guildId, storeName, year, month) {
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${month}/${year}${month}.json`;
  return (await readJSON(filePath)) || {
    店舗名: storeName,
    castSummary: [],
    kurofukuSummary: [],
    updatedAt: null,
  };
}

/**
 * 月次データ保存
 */
async function saveMonthlySyuttaikin(guildId, storeName, year, month, data) {
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${month}/${year}${month}.json`;
  data.updatedAt = new Date().toISOString();
  await saveJSON(filePath, data);
}

/**
 * 年次データ取得
 */
async function getYearlySyuttaikin(guildId, storeName, year) {
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${year}.json`;
  return (await readJSON(filePath)) || {
    year,
    店舗名: storeName,
    castTotal: {},
    kurofukuTotal: {},
    updatedAt: null,
  };
}

/**
 * 年次データ保存
 */
async function saveYearlySyuttaikin(guildId, storeName, year, data) {
  const filePath = `${getBasePath(guildId)}/${storeName}/${year}/${year}.json`;
  data.updatedAt = new Date().toISOString();
  await saveJSON(filePath, data);
}

/* -------------------------------------------------------------------------- */
/* 📦 エクスポート */
/* -------------------------------------------------------------------------- */
module.exports = {
  getSyutConfig,
  saveSyutConfig,
  getDailySyuttaikin,
  saveDailySyuttaikin,
  getMonthlySyuttaikin,
  saveMonthlySyuttaikin,
  getYearlySyuttaikin,
  saveYearlySyuttaikin,
};
