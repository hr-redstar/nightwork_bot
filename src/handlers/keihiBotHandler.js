// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// 経費機能のエントリーポイント（interactionCreate から呼ばれる）
// ./keihi/index.js をラップするだけ
// ----------------------------------------------------

const { IDS: KEIHI_IDS } = require('./keihi/request/ids');

/**
 * keihi_* 系のボタン / セレクト / モーダルの共通エントリ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  const customId = interaction.customId || '';

  // ===== 設定パネル系 (例: keihi_setting:...) =====
  if (customId.startsWith('keihi_setting')) {
    // ★ ここで初めて panel.js を require（遅延 require）
    const {
      handleKeihiSettingInteraction,
    } = require('./keihi/setting/panel');
    return handleKeihiSettingInteraction(interaction);
  }

  // ===== 申請 / 承認まわり (keihi_request_ など) =====
  if (
    customId.startsWith(KEIHI_IDS.PREFIX.BUTTON) ||
    customId.startsWith(KEIHI_IDS.PREFIX.SELECT) ||
    customId.startsWith(KEIHI_IDS.PREFIX.MODAL)
  ) {
    const { handleRequestInteraction } = require('./keihi/request');
    return handleRequestInteraction(interaction);
  }

  // 他に keihi_ プレフィックスの機能があればここに追加
}

module.exports = {
  handleInteraction,
};
