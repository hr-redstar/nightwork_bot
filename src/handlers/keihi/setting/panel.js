// src/handlers/keihi/setting/panel.js
// 経費設定パネルの薄いラッパー
// 既存の keihiPanel_Setting.js を再エクスポートして
// /commands/11_設定経費.js からの require を解決する

const keihiPanelSetting = require('./keihiPanel_Setting');

module.exports = {
  resolveStoreName: keihiPanelSetting.resolveStoreName,
  buildKeihiSettingPanelPayload: keihiPanelSetting.buildKeihiSettingPanelPayload,
  postKeihiSettingPanel: keihiPanelSetting.postKeihiSettingPanel,
  refreshKeihiSettingPanelMessage: keihiPanelSetting.refreshKeihiSettingPanelMessage,
  sendKeihiPanel: keihiPanelSetting.sendKeihiPanel,
};
