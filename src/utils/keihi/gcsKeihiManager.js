// src/utils/keihi/gcsKeihiManager.js
// ----------------------------------------------------
// 経費パネル一覧の管理（GCS / ローカル両対応）
// ----------------------------------------------------

const dayjs = require('dayjs');
const logger = require('../logger');
const { readJSON, saveJSON } = require('../gcs');
const { panelListPath } = require('./keihiConfigManager');

// パネルの初期データ
const defaultPanelData = {
  panels: [],
};

/**
 * パネル一覧を取得
 */
async function getKeihiPanelList(guildId) {
  const file = panelListPath(guildId);

  try {
    const data = await readJSON(file);
    if (!data) {
      logger.info(`[gcsKeihi] パネル一覧が存在しません（新規作成）: ${file}`);
      return { ...defaultPanelData };
    }

    // panels が無ければ初期化
    return {
      ...defaultPanelData,
      ...data,
      panels: Array.isArray(data.panels) ? data.panels : [],
    };
  } catch (err) {
    logger.error('[gcsKeihi] パネル一覧読込エラー:', err);
    return { ...defaultPanelData };
  }
}

/**
 * パネル一覧を保存
 */
async function saveKeihiPanelList(guildId, data) {
  const file = panelListPath(guildId);

  try {
    const saveData = {
      ...defaultPanelData,
      ...data,
      panels: Array.isArray(data.panels) ? data.panels : [],
      updatedAt: dayjs().toISOString(),
    };

    await saveJSON(file, saveData);
    return true;
  } catch (err) {
    logger.error('[gcsKeihi] パネル一覧保存エラー:', err);
    return false;
  }
}

/**
 * パネルを追加
 */
async function addKeihiPanel(guildId, panelInfo) {
  const list = await getKeihiPanelList(guildId);

  list.panels.push({
    store: panelInfo.store,
    channelId: panelInfo.channelId,
    messageId: panelInfo.messageId,
    approvalRoles: panelInfo.approvalRoles || [],
    viewRoles: panelInfo.viewRoles || [],
    applyRoles: panelInfo.applyRoles || [],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  });

  return await saveKeihiPanelList(guildId, list);
}

/**
 * 特定店舗のパネルを取得
 */
async function getPanelByStore(guildId, store) {
  const list = await getKeihiPanelList(guildId);
  return list.panels.find((p) => p.store === store) || null;
}

/**
 * パネル情報を更新
 */
async function updateKeihiPanel(guildId, store, updates) {
  const list = await getKeihiPanelList(guildId);

  const panel = list.panels.find((p) => p.store === store);
  if (!panel) return false;

  Object.assign(panel, updates, {
    updatedAt: dayjs().toISOString(),
  });

  return await saveKeihiPanelList(guildId, list);
}

/**
 * パネルを削除
 */
async function deleteKeihiPanel(guildId, store) {
  const list = await getKeihiPanelList(guildId);

  list.panels = list.panels.filter((p) => p.store !== store);

  return await saveKeihiPanelList(guildId, list);
}

module.exports = {
  getKeihiPanelList,
  saveKeihiPanelList,
  addKeihiPanel,
  getPanelByStore,
  updateKeihiPanel,
  deleteKeihiPanel,
};
