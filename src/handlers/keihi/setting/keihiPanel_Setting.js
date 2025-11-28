// src/handlers/keihi/keihiPanel_Setting.js
// ----------------------------------------------------
// 経費「設定パネル」用のラッパーファイル
// 実処理は ./setting/index.js に分離
// ----------------------------------------------------

const {
  postKeihiSettingPanel,
  handleKeihiSettingInteraction,
} = require('./index');

module.exports = {
  postKeihiSettingPanel,
  handleKeihiSettingInteraction,
};
