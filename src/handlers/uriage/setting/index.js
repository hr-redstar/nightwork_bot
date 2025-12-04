// src/handlers/uriage/setting/index.js
// ----------------------------------------------------
// 売上 設定系 入口
//   - /設定売上 コマンド
//   - 売上設定パネル内のボタン／セレクトの振り分け
// ----------------------------------------------------

const { IDS } = require('./ids');
const { sendUriageSettingPanel } = require('./panel');
const {
  handleUriageReportPanelButton,
  handleUriageStoreSelectForPanel,
  handleUriageChannelSelectForPanel,
} = require('./requestFlow');
const {
  openApproverRoleSelector,
  handleApproverStoreSelect,
  handleApproverRoleSelect,
} = require('./approverRoles');
const {
  openCsvExportFlow,
  handleCsvExportSelection,
} = require('./csv');

/**
 * /設定売上 コマンド
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleUriageSettingCommand(interaction) {
  return sendUriageSettingPanel(interaction);
}

/**
 * 売上設定パネルでのコンポーネント共通ハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleUriageSettingInteraction(interaction) {
  const customId = interaction.customId || '';

  // ボタン
  if (interaction.isButton()) {
    if (customId === IDS.BTN_OPEN_PANEL_LOCATION) {
      return handleUriageReportPanelButton(interaction);
    }
    if (customId === IDS.BTN_OPEN_APPROVER_ROLE) {
      return openApproverRoleSelector(interaction);
    }
    if (customId === IDS.BTN_OPEN_CSV_EXPORT) {
      return openCsvExportFlow(interaction);
    }
  }

  // StringSelect
  if (interaction.isStringSelectMenu()) {
    if (customId === IDS.SELECT_STORE_FOR_PANEL) {
      return handleUriageStoreSelectForPanel(interaction);
    }
    if (customId === IDS.SELECT_STORE_FOR_APPROVER) {
      return handleApproverStoreSelect(interaction);
    }
    if (customId === IDS.SELECT_STORE_FOR_CSV) {
      return handleCsvExportSelection(interaction);
    }
    if (customId.startsWith(`${IDS.SELECT_CSV_TYPE}:`)) {
      return handleCsvExportSelection(interaction);
    }
  }

  // ChannelSelect（売上報告パネル設置）
  if (
    typeof interaction.isChannelSelectMenu === 'function' &&
    interaction.isChannelSelectMenu()
  ) {
    if (customId.startsWith(`${IDS.SELECT_CHANNEL_FOR_PANEL}:`)) {
      return handleUriageChannelSelectForPanel(interaction);
    }
  }

  // RoleSelect（承認役職）
  if (
    typeof interaction.isRoleSelectMenu === 'function' &&
    interaction.isRoleSelectMenu()
  ) {
    if (customId.startsWith(`${IDS.SELECT_ROLE_FOR_APPROVER}:`)) {
      return handleApproverRoleSelect(interaction);
    }
  }

  // マッチしない場合は何もしない
  return;
}

module.exports = {
  handleUriageSettingCommand,
  handleUriageSettingInteraction,
};