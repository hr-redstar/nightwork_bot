// src/handlers/uriage/setting/index.js
// ----------------------------------------------------
// 売上 設定系 入口
//   - /設定売上 コマンド
//   - 売上設定パネル内のボタン／セレクトの振り分け
// ----------------------------------------------------

const { IDS } = require('./ids');
const { sendUriageSettingPanel } = require('./panel');
const {
  openPanelLocationSelector,
  handleStoreSelectForPanel,
  handleChannelSelectForPanel,
} = require('./panelLocation');
const {
  openApproverRoleSelector,
  handleApproverStoreSelect,
  handleApproverRoleSelect,
} = require('./approverRoles');
const {
  openUriageCsvExport,
  handleUriageCsvStoreSelect,
  handleUriageCsvTypeSelect,
} = require('./csv');
const {
  handleSetApproverButton,
  handleApproverRolesSelect,
} = require('./role');
const { handleStoreDetailSetting } = require('./store');
const { handleItemSetting } = require('./item');

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
      return openPanelLocationSelector(interaction);
    }
    if (customId === IDS.BTN_OPEN_APPROVER_ROLE) {
      return openApproverRoleSelector(interaction);
    }
    if (customId === IDS.BTN_OPEN_CSV_EXPORT) {
      return openUriageCsvExport(interaction);
    }
  }

  // StringSelect
  if (interaction.isStringSelectMenu()) {
    if (customId === IDS.SELECT_STORE_FOR_PANEL) {
      return handleStoreSelectForPanel(interaction);
    }
    if (customId === IDS.SELECT_STORE_FOR_APPROVER) {
      return handleApproverStoreSelect(interaction);
    }
    if (customId === IDS.SELECT_STORE_FOR_CSV) {
      return handleUriageCsvStoreSelect(interaction);
    }
    if (customId.startsWith(`${IDS.SELECT_CSV_TYPE}:`)) {
      return handleUriageCsvTypeSelect(interaction);
    }
  }

  // ChannelSelect（売上報告パネル設置）
  if (
    typeof interaction.isChannelSelectMenu === 'function' &&
    interaction.isChannelSelectMenu()
  ) {
    if (customId.startsWith(`${IDS.SELECT_CHANNEL_FOR_PANEL}:`)) {
      return handleChannelSelectForPanel(interaction);
    }
  }

  // RoleSelect（承認役職）
  if (
    typeof interaction.isRoleSelectMenu === 'function' &&
    interaction.isRoleSelectMenu()
  ) {
    if (customId.startsWith(`${IDS.SELECT_ROLE_FOR_APPROVER}:`)) {
      return handleApproverRolesSelect(interaction);
    }
  }

  // マッチしない場合は何もしない
  return;
}

module.exports = {
  handleUriageSettingCommand,
  handleUriageSettingInteraction,
};