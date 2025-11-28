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

  // ボタン
  if (interaction.isButton()) {
    if (id === IDS.BTN_SET_PANEL) {
      return handleSetPanelButton(interaction);
    }
    if (id === IDS.BTN_SET_APPROVER) {
      return handleSetApproverButton(interaction);
    }
    if (id === IDS.BTN_EXPORT_CSV) {
      return handleExportCsvButton(interaction);
    }
  }

  // StringSelect
  if (interaction.isStringSelectMenu()) {
    if (id === IDS.SEL_STORE_FOR_PANEL) {
      return handleStoreForPanelSelect(interaction);
    }
    if (id === IDS.SEL_CSV_STORE) {
      return handleCsvStoreSelect(interaction);
    }
    if (id.startsWith(`${IDS.SEL_CSV_PERIOD}:`)) {
      return handleCsvPeriodSelect(interaction);
    }
    if (id === IDS.SEL_APPROVER_ROLES) {
      return handleApproverRolesSelect(interaction);
    }
  }

  // ChannelSelect
  if (interaction.isChannelSelectMenu()) {
    if (id.startsWith(PANEL_CHANNEL_PREFIX)) {
      return handlePanelChannelSelect(interaction, refreshKeihiSettingPanelMessage);
    }
  }

  // RoleSelect
  if (interaction.isRoleSelectMenu()) {
    // RoleSelect は現在使用していない
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
