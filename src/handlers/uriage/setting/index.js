// src/handlers/uriage/setting/index.js
// ----------------------------------------------------
// 売上設定関連のインタラクションを処理する
// ----------------------------------------------------

const { IDS } = require('./ids'); // setting/ids.js を参照
const { handleSetPanelButton, handleStoreForPanelSelect, handlePanelChannelSelect } = require('./panelLocation.js');
const { handleSetApproverButton, handleApproverRolesSelect, handleSetViewerButton, handleViewerRoleSelect, handleSetApplicantButton, handleApplicantRoleSelect } = require('./role');
const { openCsvExportFlow, handleCsvExportSelection } = require('./csv'); // openCsvExportFlow は handleExportCsvButton にリネーム

async function handleUriageSettingInteraction(interaction) {
  const { customId } = interaction;

  // 報告パネル設置
  if (customId === IDS.BTN_PANEL_SETUP) return handleSetPanelButton(interaction); // keihi の handleSetPanelButton
  if (customId === IDS.SEL_STORE_FOR_PANEL) return handleStoreForPanelSelect(interaction);
  if (customId.startsWith(IDS.SEL_PANEL_CHANNEL)) return handlePanelChannelSelect(interaction);

  // 役職設定
  if (customId === IDS.BTN_ROLE_APPROVER) return handleSetApproverButton(interaction); // keihi の handleSetApproverButton
  if (customId === IDS.BTN_ROLE_VIEWER) return handleSetViewerButton(interaction);
  if (customId === IDS.BTN_ROLE_APPLICANT) return handleSetApplicantButton(interaction);
  if (customId === IDS.SEL_APPROVER_ROLE) return handleApproverRolesSelect(interaction); // keihi の handleApproverRolesSelect
  if (customId === IDS.SEL_VIEWER_ROLE) return handleViewerRoleSelect(interaction);
  if (customId === IDS.SEL_APPLICANT_ROLE) return handleApplicantRoleSelect(interaction);

  // CSV発行
  if (customId === IDS.BTN_CSV_EXPORT) return openCsvExportFlow(interaction); // keihi の handleExportCsvButton
  if (customId === IDS.SEL_CSV_STORE || customId.startsWith(IDS.SEL_CSV_PERIOD)) { // keihi の handleCsvStoreSelect, handleCsvPeriodSelect
    return handleCsvExportSelection(interaction);
  }
}

module.exports = {
  handleUriageSettingInteraction,
};