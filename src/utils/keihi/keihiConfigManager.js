// src/utils/keihi/keihiConfigManager.js
// ----------------------------------------------------
// 経費設定およびデータパス管理（統合・完全版）
// ----------------------------------------------------

const dayjs = require("dayjs");
const logger = require("../logger");
const { readJSON, saveJSON, exists } = require("../gcs");

// =====================================================
// パス生成ロジック
// =====================================================

// 日別経費データ
function dailyPath(guildId, store, y, m, d) {
  return `GCS/${guildId}/keihi/${store}/${y}/${m}/${d}/${y}${m}${d}.json`;
}

// 経費設定ファイル
function configPath(guildId) {
  return `GCS/${guildId}/keihi/config.json`;
}

// =====================================================
// デフォルト設定
// =====================================================

const defaultConfig = {
  approvalRoles: [], // 承認役職
  viewRoles: [], // 閲覧役職
  applyRoles: [], // 申請役職
  panelMap: {}, // ← 経費パネル設置一覧（店舗 → channelId）
  lastUpdated: null,
};

// =====================================================
// 経費設定 読み込み / 保存
// =====================================================

async function loadKeihiConfig(guildId) {
  const path = configPath(guildId);

  try {
    const data = await readJSON(path);
    if (!data) {
      logger.info(`[keihiConfig] 設定ファイルが存在しません（新規作成）: ${path}`);
      return { ...defaultConfig };
    }

    return {
      ...defaultConfig,
      ...data,
    };
  } catch (err) {
    logger.error("[keihiConfig] 設定読込エラー:", err);
    return { ...defaultConfig };
  }
}

async function saveKeihiConfig(guildId, config) {
  const path = configPath(guildId);

  try {
    const data = {
      ...defaultConfig,
      ...config,
      lastUpdated: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    };

    await saveJSON(path, data);
    return true;
  } catch (err) {
    logger.error("[keihiConfig] 設定保存エラー:", err);
    return false;
  }
}

// =====================================================
// 経費パネル（store → channelId）の管理
// =====================================================

async function getKeihiPanelList(guildId) {
  const config = await loadKeihiConfig(guildId);
  return config.panelMap || {};
}

async function setKeihiPanelList(guildId, panelMap) {
  const config = await loadKeihiConfig(guildId);
  config.panelMap = panelMap;
  return await saveKeihiConfig(guildId, config);
}

// =====================================================
// 日別経費データ保存
// =====================================================

async function saveDailyKeihi(guildId, store, entry) {
  const now = dayjs();
  const y = now.format("YYYY");
  const m = now.format("MM");
  const d = now.format("DD");

  const filePath = dailyPath(guildId, store, y, m, d);

  try {
    let list = [];

    if (await exists(filePath)) {
      const old = await readJSON(filePath);
      if (Array.isArray(old)) list = old;
    }

    list.push({
      ...entry,
      timestamp: now.toISOString(),
    });

    await saveJSON(filePath, list);
    return true;
  } catch (err) {
    logger.error("[keihiConfig] 日別データ保存エラー:", err);
    return false;
  }
}

// =====================================================
// Export
// =====================================================

module.exports = {
  // パス
  dailyPath,
  configPath,

  // 設定の読込/保存
  loadKeihiConfig,
  saveKeihiConfig,

  // パネル
  getKeihiPanelList,
  setKeihiPanelList,

  // 経費データ保存
  saveDailyKeihi,
};
