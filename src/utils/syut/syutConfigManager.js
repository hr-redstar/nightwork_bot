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
/* ⚙️ 店舗別設定管理 (Panel, Roles) - 新設計 */
/* -------------------------------------------------------------------------- */

/**
 * パネル設定取得
 * @param {string} guildId
 * @param {'cast'|'staff'} type
 * @param {string} storeName
 */
async function getPanelConfig(guildId, type, storeName) {
  const filePath = `${getBasePath(guildId)}/${type}/${storeName}/panel.json`;
  return (await readJSON(filePath)) || {};
}

/**
 * パネル設定保存
 */
async function setPanelConfig(guildId, type, storeName, data) {
  const filePath = `${getBasePath(guildId)}/${type}/${storeName}/panel.json`;
  await saveJSON(filePath, data);
}

/**
 * 役職設定（役職→ロール紐付け）取得
 * @param {string} guildId
 * @param {'cast'|'staff'} type
 * @param {string} storeName
 */
async function getRoleConfig(guildId, type, storeName) {
  const filePath = `${getBasePath(guildId)}/${type}/${storeName}/roles.json`;
  return (await readJSON(filePath)) || {};
}

/**
 * 役職設定保存
 */
async function setRoleConfig(guildId, type, storeName, data) {
  const filePath = `${getBasePath(guildId)}/${type}/${storeName}/roles.json`;
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
/* ⏰ スケジュール集約管理 (Cron用) */
/* -------------------------------------------------------------------------- */

/**
 * 全ギルドの出退勤設定をスキャンし、有効な通知スケジュールリストを返す
 * @param {Array<string>} guildIds - スキャン対象のギルドIDリスト
 * @returns {Promise<Array<{ time: string, guildId: string, storeName: string, channelId: string }>>}
 */
async function getAllSyutSchedules(guildIds) {
  const schedules = [];

  for (const guildId of guildIds) {
    try {
      const config = await getSyutConfig(guildId);
      if (!config || !config.castPanelList) continue;

      for (const [storeName, info] of Object.entries(config.castPanelList)) {
        if (info.time && info.channel) {
          // 全角コロンを半角に、前後の空白を除去
          const time = info.time.replace(/：/g, ':').trim();
          // HH:mm 形式のみ許可
          if (/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            schedules.push({
              time,
              guildId,
              storeName,
              channelId: info.channel.replace(/[<#>]/g, ''),
            });
          }
        }
      }
    } catch (err) {
      // 個別のギルド設定読み込みエラーはスキップして続行
      console.warn(`[getAllSyutSchedules] Failed to load config for guild ${guildId}:`, err.message);
    }
  }

  return schedules;
}

/* -------------------------------------------------------------------------- */
/* 📦 エクスポート */
/* -------------------------------------------------------------------------- */
module.exports = {
  getSyutConfig,
  saveSyutConfig,
  getPanelConfig,
  setPanelConfig,
  getRoleConfig,
  setRoleConfig,
  getDailySyuttaikin,
  saveDailySyuttaikin,
  getMonthlySyuttaikin,
  saveMonthlySyuttaikin,
  getYearlySyuttaikin,
  saveYearlySyuttaikin,
  getAllSyutSchedules, // 追加
};
