// src/handlers/keihi/setting/panel.js
// ----------------------------------------------------
// 経費設定パネルの薄いラッパー
// 既存の keihiPanel_Setting.js を遅延 require して
// /commands/11_設定経費.js や keihiBotHandler からの参照を吸収する
// ----------------------------------------------------

// ★ ここではトップレベルで keihiPanel_Setting を require しない
function getImpl() {
  // 循環参照対策：実際に使うときにだけ require する
  // require のキャッシュが効くので毎回読み込みは発生しない
  // eslint-disable-next-line global-require
  return require('./keihiPanel_Setting');
}

function resolveStoreName(...args) {
  return getImpl().resolveStoreName(...args);
}

function buildKeihiSettingPanelPayload(...args) {
  return getImpl().buildKeihiSettingPanelPayload(...args);
}

async function postKeihiSettingPanel(...args) {
  return getImpl().postKeihiSettingPanel(...args);
}

async function refreshKeihiSettingPanelMessage(...args) {
  return getImpl().refreshKeihiSettingPanelMessage(...args);
}

// 旧インターフェース互換が必要ならそのまま残す
async function sendKeihiPanel(...args) {
  return getImpl().sendKeihiPanel(...args);
}

async function handleKeihiSettingInteraction(...args) {
  return getImpl().handleKeihiSettingInteraction(...args);
}

module.exports = {
  resolveStoreName,
  buildKeihiSettingPanelPayload,
  postKeihiSettingPanel,
  refreshKeihiSettingPanelMessage,
  sendKeihiPanel,
  handleKeihiSettingInteraction,
};
