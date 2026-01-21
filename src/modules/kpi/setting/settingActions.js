// src/modules/kpi/setting/settingActions.js
// ----------------------------------------------------
// KPI 設定パネルのアクション処理
//  - KPI設置
//  - KPI承認役職
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');

// 仮ストア（後でDB / JSONに置き換え）
const kpiConfigStore = require('../store/kpiConfigStore');
const storeMaster = require('../../common/constants/stores');

// ====================================================
// KPI設置
// ====================================================
async function handleKpiInstall(interaction) {
  try {
    // 店舗選択メニュー
    const storeOptions = storeMaster.map(store => ({
      label: store.name,
      value: store.id,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('kpi:select:store')
        .setPlaceholder('設置する店舗を選択してください')
        .addOptions(storeOptions)
    );

    await interaction.reply({
      content: '📊 KPIを設置する店舗を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[KPI] handleKpiInstall error:', err);
  }
}

// ====================================================
// KPI承認役職
// ====================================================
async function handleKpiApproveRole(interaction) {
  try {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('kpi:select:role')
        .setPlaceholder('KPI承認役職を選択してください')
    );

    await interaction.reply({
      content: '📊 KPI承認役職を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[KPI] handleKpiApproveRole error:', err);
  }
}

// ====================================================
// Setup ルーティング (kpi:setup:*)
// ====================================================
async function handleKpiSetup(interaction, subAction) {
  const {
    handleKpiChannelSelect,
    handleKpiRoleSelect,
  } = require('../../../handlers/KPI/KPISetupHandler');

  if (subAction === 'channel') {
    return await handleKpiChannelSelect(interaction);
  }
  if (subAction === 'role') {
    return await handleKpiRoleSelect(interaction);
  }
}

// ====================================================
// Setting ルーティング (kpi:setting:*)
// ====================================================
async function handleKpiSetting(interaction, subAction) {
  const {
    handleKpiSetupStore,
    handleKpiSetupRole,
  } = require('../../../handlers/KPI/KPISetupHandler');

  if (subAction === 'install') {
    return await handleKpiSetupStore(interaction);
  }
  if (subAction === 'approveRole') {
    return await handleKpiSetupRole(interaction);
  }

  await interaction.reply({
    content: '⚠️ 未対応の設定アクションです。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleKpiInstall,
  handleKpiApproveRole,
  handleKpiSetup,
  handleKpiSetting,
};