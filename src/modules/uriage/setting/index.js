// src/handlers/uriage/setting/index.js
// 売上設定系 interaction 集約ハンドラ

const { IDS } = require('./ids');
const { handleExportCsvButton, handleCsvFlowInteraction } = require('./csv');
const {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
} = require('./panelLocation');
const { handleSetApproverButton, handleApproverRolesSelect } = require('./approver');
const { refreshUriageSettingPanelMessage } = require('./panel');

/**
 * 売上設定パネル/CSV/承認役職まわりの dispatcher
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageSettingInteraction(interaction) {
  const customId = interaction.customId || '';

  // ボタン
  if (interaction.isButton()) {
    if (customId === IDS.BTN_SET_PANEL) return handleSetPanelButton(interaction);
    if (customId === IDS.BTN_SET_APPROVER) return handleSetApproverButton(interaction);
    if (customId === IDS.BTN_EXPORT_CSV || customId === IDS.BUTTON_EXPORT_CSV)
      return handleExportCsvButton(interaction);
    if (customId === 'uriage:setting:btn:view_roles') {
      return handleViewRolesButton(interaction);
    }
    if (customId === 'uriage:setting:btn:request_roles') {
      return handleRequestRolesButton(interaction);
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
    if (customId === IDS.SEL_STORE_FOR_PANEL) return handleStoreForPanelSelect(interaction);
    if (customId.startsWith(IDS.PANEL_CHANNEL_PREFIX)) {
      return handlePanelChannelSelect(interaction, refreshUriageSettingPanelMessage);
    }
    if (customId === IDS.SEL_APPROVER_ROLES) return handleApproverRolesSelect(interaction);
    if (customId === IDS.SELECT_STORE_FOR_CSV || customId === IDS.SELECT_CSV_TARGET) {
      return handleCsvFlowInteraction(interaction);
    }
    return;
  }
}

module.exports = {
  handleUriageSettingInteraction,
};
