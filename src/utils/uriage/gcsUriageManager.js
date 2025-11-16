// src/utils/uriage/gcsUriageManager.js
/**
 * 売上（uriage）関連のGCS入出力共通関数
 */
const path = require('path');
const fs = require('fs');
const { readJson, writeJson, readFile, writeFile, listFiles } = require('../gcs');
const { loadStoreRoleConfig } = require('../config/storeRoleConfigManager');

//------------------------------------------------------------
// 🔹 ファイルパス定義
//------------------------------------------------------------
function getConfigPath(guildId) {
  return `GCS/${guildId}/uriage/config.json`;
}

function getPanelListPath(guildId) {
  return `GCS/${guildId}/uriage/panelList.json`;
}

function getCsvPath(guildId, store, date) {
  return `GCS/${guildId}/uriage/${store}/売上報告_${date}.csv`;
}

//------------------------------------------------------------
// 🔹 コンフィグ取得・保存
//------------------------------------------------------------
async function getUriageConfig(guildId) {
  try {
    const filePath = getConfigPath(guildId);
    const data = await readJson(filePath);
    return data || {};
  } catch (err) {
    console.warn(`[GCS] 売上設定ファイルが存在しません (${guildId})`);
    return {};
  }
}

async function saveUriageConfig(guildId, configData) {
  const filePath = getConfigPath(guildId);
  await writeJson(filePath, configData);
}

//------------------------------------------------------------
// 🔹 パネルリスト（店舗とチャンネル紐付け）
//------------------------------------------------------------
async function getUriagePanelList(guildId) {
  try {
    const filePath = getPanelListPath(guildId);
    const data = await readJson(filePath);
    return data?.list || [];
  } catch (err) {
    return [];
  }
}

async function saveUriagePanelList(guildId, list) {
  const filePath = getPanelListPath(guildId);
  await writeJson(filePath, { list });
}

//------------------------------------------------------------
// 🔹 店舗・役職データ取得
//------------------------------------------------------------
async function getStoreRoleConfig(guildId) {
  return await loadStoreRoleConfig(guildId);
}

/**
 * guild の店舗リストから storeId（または店舗名）に一致する店舗データを返す
 * @param {string} guildId
 * @param {string} storeId - 店舗の id もしくは名前
 * @returns {Promise<object|null>}
 */
async function getStoreById(guildId, storeId) {
  try {
    if (!storeId) return null;
    const cfg = await loadStoreRoleConfig(guildId);
    const stores = cfg?.stores || [];
    // store オブジェクトの構造が { id, name, ... } などであることを想定して柔軟に照合する
    const found = stores.find(s => {
      if (!s) return false;
      const idMatch = s.id && String(s.id) === String(storeId);
      const nameMatch = (s.name && String(s.name) === String(storeId));
      const altMatch = (s.store && String(s.store) === String(storeId));
      return idMatch || nameMatch || altMatch;
    });
    return found || null;
  } catch (err) {
    return null;
  }
}

//------------------------------------------------------------
// 🔹 更新日時の記録
//------------------------------------------------------------
async function updateUriageTimestamp(guildId) {
  const config = await getUriageConfig(guildId);
  config.updatedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  await saveUriageConfig(guildId, config);
}

//------------------------------------------------------------
// 🔹 CSV操作
//------------------------------------------------------------
/**
 * 売上CSVの保存
 * @param {string} guildId
 * @param {string} store
 * @param {string} dateStr YYYYMMDD
 * @param {object} data { date, user, approver, total, cash, card, cost, remain, createdAt }
 */
async function saveUriageCsv(guildId, store, dateStr, data, status = 'ok') {
  const filePath = getCsvPath(guildId, store, dateStr);

  // 新しいCSVヘッダ（ステータス列を追加）
  const header = '日付,入力者,承認者,総売り,現金,カード,諸経費,残金,登録日時,ステータス\n';
  const line = `${data.date},${data.user},${data.approver || ''},${data.total},${data.cash},${data.card},${data.cost},${data.remain},${data.createdAt},${status}\n`;

  // 既存ファイルの内容を読み込む
  const existingContent = await readFile(filePath);

  if (!existingContent) {
    // ファイルがなければ新しいヘッダと行を作成
    const newContent = header + line;
    await writeFile(filePath, newContent);
    return;
  }

  // 既存ファイルがある場合、ヘッダにステータス列がなければ互換処理を行う
  const lines = existingContent.split('\n');
  const existingHeader = lines[0] || '';
  let updatedContent = existingContent;

  if (!existingHeader.includes('ステータス')) {
    // 既存の各データ行末に ',ok' を追加して新ヘッダに合わせる
    const bodyLines = lines.slice(1).filter(l => l.trim().length > 0).map(l => `${l},ok`);
    updatedContent = header + bodyLines.join('\n') + '\n';
  }

  // 追記する
  await writeFile(filePath, updatedContent + line);
}

/**
 * 指定店舗のCSVファイル一覧を取得
 */
async function getCsvFileList(guildId, store) {
  const prefix = `GCS/${guildId}/uriage/${store}/`;
  const allFiles = await listFiles(prefix);
  return allFiles.filter(f => f.endsWith('.csv')).map(f => path.basename(f));
}

module.exports = {
  getUriageConfig,
  saveUriageConfig,
  getUriagePanelList,
  saveUriagePanelList,
  getStoreRoleConfig,
  updateUriageTimestamp,
  saveUriageCsv,
  getCsvFileList,
  getStoreById,
};
