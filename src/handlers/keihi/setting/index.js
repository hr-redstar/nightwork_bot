// src/handlers/keihi/setting/index.js
// ----------------------------------------------------
// 経費「設定」系インタラクションのルーター
//   - 設定パネル上のボタン / セレクトを振り分ける
// ----------------------------------------------------

const { IDS } = require('./ids');
const {
  handleExportCsvButton,
  handleCsvFlowInteraction,
} = require('./csv');
const {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
} = require('./panelLocation');
const {
  handleSetApproverButton,
  handleApproverRolesSelect,
} = require('./approver');
const { refreshKeihiSettingPanelMessage } = require('./panel');

/**
 * 経費 設定系インタラクションを処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handleSettingInteraction(interaction) {
  const customId = interaction.customId || '';

  // ボタン
  if (interaction.isButton()) {
    if (customId === IDS.BTN_SET_PANEL) {
      return handleSetPanelButton(interaction);
    }
    if (customId === IDS.BTN_SET_APPROVER) {
      return handleSetApproverButton(interaction);
    }
    if (customId === IDS.BTN_EXPORT_CSV || customId === IDS.BUTTON_EXPORT_CSV) {
      return handleExportCsvButton(interaction);
    }
    if (
      customId === IDS.BUTTON_CSV_RANGE_DAILY ||
      customId === IDS.BUTTON_CSV_RANGE_MONTHLY ||
      customId === IDS.BUTTON_CSV_RANGE_YEARLY ||
      customId === IDS.BUTTON_CSV_RANGE_QUARTER
    ) {
      return handleCsvFlowInteraction(interaction);
    }
    return;
  }

  // セレクトメニュー
  if (interaction.isAnySelectMenu()) {
    if (customId === IDS.SEL_STORE_FOR_PANEL) {
      return handleStoreForPanelSelect(interaction);
    }
    if (customId.startsWith(IDS.PANEL_CHANNEL_PREFIX)) {
      return handlePanelChannelSelect(
        interaction,
        refreshKeihiSettingPanelMessage,
      );
    }
    if (customId === IDS.SEL_APPROVER_ROLES) {
      return handleApproverRolesSelect(interaction);
    }
    if (
      customId === IDS.SELECT_STORE_FOR_CSV ||
      customId === IDS.SELECT_CSV_TARGET
    ) {
      return handleCsvFlowInteraction(interaction);
    }
    return;
  }

  return;
}

module.exports = {
  handleSettingInteraction,
};
