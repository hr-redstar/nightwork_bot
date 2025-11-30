// src/utils/uriage/gcsUriageSettingManager.js
// ----------------------------------------------------
// 売上設定（承認役職 / パネル一覧 など）を保存・読み込み
//
// パス: GCS/<guildId>/uriage/setting/config.json
// {
//   approverRoles: ["店長", "黒服"],
//   panels: [
//     { storeName, channelId, viewRoles: [], requestRoles: [] }
//   ]
// }
// ----------------------------------------------------

const { readJSON, saveJSON } = require('../gcs');
const logger = require('../logger');

function uriageSettingPath(guildId) {
  return `${guildId}/uriage/setting/config.json`;
}

function createDefaultSetting() {
  return {
    approverRoles: [],
    panels: [],
  };
}

async function loadUriageSetting(guildId) {
  try {
    const data = (await readJSON(uriageSettingPath(guildId))) || {};
    return {
      ...createDefaultSetting(),
      ...data,
      approverRoles: Array.isArray(data.approverRoles) ? data.approverRoles : [],
      panels: Array.isArray(data.panels) ? data.panels : [],
    };
  } catch (err) {
    logger.error('[gcsUriageSetting] 読み込みエラー:', guildId, err);
    return createDefaultSetting();
  }
}

async function saveUriageSetting(guildId, setting) {
  try {
    await saveJSON(uriageSettingPath(guildId), setting || createDefaultSetting());
    return true;
  } catch (err) {
    logger.error('[gcsUriageSetting] 保存エラー:', guildId, err);
    throw err;
  }
}

/**
 * 店舗 + チャンネル に対応するパネル情報を取得 or 作成
 */
function getOrCreatePanel(setting, storeName, channelId) {
  const panels = setting.panels || [];
  let panel = panels.find(
    (p) => p.storeName === storeName && p.channelId === channelId,
  );
  if (!panel) {
    panel = {
      storeName,
      channelId,
      viewRoles: [],
      requestRoles: [],
    };
    panels.push(panel);
    setting.panels = panels;
  }
  return panel;
}

module.exports = {
  uriageSettingPath,
  loadUriageSetting,
  saveUriageSetting,
  getOrCreatePanel, // ★ 追加
};