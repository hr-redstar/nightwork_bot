// src/handlers/keihi/setting/index.js
// ----------------------------------------------------
// 経費「設定パネル」系 入口
//   - /設定経費 から postKeihiSettingPanel を使う
//   - ボタン / セレクトの customId を見て各モジュールへ振り分け
// ----------------------------------------------------

const {
  IDS,
  PANEL_CHANNEL_PREFIX,
} = require('./ids');

const {
  postKeihiSettingPanel,
  buildKeihiSettingPanelPayload,
  refreshKeihiSettingPanelMessage,
} = require('./panel');

const {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
} = require('./panelLocation');

const {
  handleSetApproverButton,
  handleApproverRolesSelect,
} = require('./approver');

const {
  handleExportCsvButton,
  handleCsvStoreSelect,
  handleCsvPeriodSelect,
} = require('./csvExport');

/**
 * 経費「設定」系インタラクションのまとめハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKeihiSettingInteraction(interaction) {
  const id = interaction.customId;
  if (!id) return;

  // ここに来るのは keihiBotHandlers 側で keihi_config: プレフィックスに
  // 絞り込まれている想定だが、念のため型チェックもしておく

  // ---------------- ボタン ----------------
  if (interaction.isButton()) {
    if (id === IDS.BTN_SET_PANEL) {
      // 「パネル設置」ボタン
      return handleSetPanelButton(interaction);
    }
    if (id === IDS.BTN_SET_APPROVER) {
      // 「承認役職設定」ボタン
      return handleSetApproverButton(interaction);
    }
    if (id === IDS.BTN_EXPORT_CSV) {
      // 「CSV出力」ボタン
      return handleExportCsvButton(interaction);
    }
    return;
  }

  // ---------------- 文字列セレクト ----------------
  if (interaction.isStringSelectMenu()) {
    if (id === IDS.SEL_STORE_FOR_PANEL) {
      // パネル設置対象店舗の選択
      return handleStoreForPanelSelect(interaction);
    }
    if (id === IDS.SEL_CSV_STORE) {
      // CSV出力対象店舗の選択
      return handleCsvStoreSelect(interaction);
    }
    if (id.startsWith(`${IDS.SEL_CSV_PERIOD}:`)) {
      // CSV出力の期間選択
      return handleCsvPeriodSelect(interaction);
    }
    if (id === IDS.SEL_APPROVER_ROLES) {
      // 承認役職の選択
      return handleApproverRolesSelect(interaction);
    }
    return;
  }

  // ---------------- チャンネルセレクト ----------------
  if (interaction.isChannelSelectMenu()) {
    // 設定パネルの設置先チャンネル選択
    if (id.startsWith(PANEL_CHANNEL_PREFIX)) {
      return handlePanelChannelSelect(interaction, refreshKeihiSettingPanelMessage);
    }
    return;
  }

  // ---------------- ロールセレクト（今は未使用） ----------------
  if (interaction.isRoleSelectMenu()) {
    // 現状は使用していないが、将来拡張用にここで受けておく
    return;
  }
}

module.exports = {
  IDS,
  PANEL_CHANNEL_PREFIX,
  postKeihiSettingPanel,
  buildKeihiSettingPanelPayload,
  refreshKeihiSettingPanelMessage,
  handleKeihiSettingInteraction,
};
