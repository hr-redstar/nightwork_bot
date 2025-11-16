/**
 * KPIBotHandler.js
 * KPI関連のインタラクションを捌くメインルーター
 */
const { MessageFlags } = require('discord.js');
const { getStoreList } = require('../utils/config/configAccessor');
const { handleKpiSetup, handleStoreSelect, handleChannelSelect } = require('./KPI/KPIStoreSetup');
const { handleRoleSetup, handleRoleSelect } = require('./KPI/kpiRoleHandler');

async function handleKpiInteraction(interaction) {
  const { customId } = interaction;

  if (interaction.isButton()) {
    // 「KPI設置」ボタン
    if (customId === 'kpi_setup_store') {
      return handleKpiSetup(interaction);
    }
    // 「KPI承認役職」ボタン
    if (customId === 'kpi_role_setup') {
      return handleRoleSetup(interaction);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (customId === 'kpi_select_store') return handleStoreSelect(interaction);
    if (customId === 'kpi_select_role') return handleRoleSelect(interaction);
  }

  if (interaction.isChannelSelectMenu()) {
    if (customId.startsWith('kpi_select_channel_')) return handleChannelSelect(interaction);
  }
}

module.exports = handleKpiInteraction;