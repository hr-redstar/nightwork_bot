/**
 * src/handlers/KPIBotHandler.js
 * KPI関連のボタン・モーダル・メニュー統括ハンドラー
 */

const { MessageFlags, InteractionType } = require('discord.js');
const { getGuildConfig } = require('../utils/config/gcsConfigManager');
const logger = require('../utils/logger');

// 各機能モジュール
const { postOrUpdateKpiStorePanel } = require('./KPI/KPIPanel_Store'); // Used for updating store-specific panels (e.g., after modal submit)
const { handleReportModalOpen, handleReportModalSubmit } = require('./KPI/KPIReportModal');
const { handleMonthlySummary } = require('./KPI/KPIMonthlyReport');
const { handleTargetModalOpen, handleTargetModalSubmit } = require('./KPI/KPITargetModal');
const { handleKpiSetup, handleStoreSelect: handleStoreSetupSelect, handleChannelSelect } = require('./KPI/KPIStoreSetup'); // For KPI setup flow (buttons and select menus)
const { handleRoleSelectStart, handleRoleSelectSubmit } = require('./KPI/KPIRoleSetup'); // For KPI role setup flow (buttons and select menus)
const { handleRoleSelect: handleLegacyRoleSelect } = require('./KPI/KPISelectors'); // Legacy/other selectors (e.g., kpi_role_ for select menu)

async function KPIBotHandler(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild?.id;

  try {
    // -------------------------------
    // ボタン押下 (Buttons)
    // -------------------------------
    if (interaction.isButton()) {
      // Main KPI Setup Panel buttons (from KPIPanel_Setup.js)
      // kpi_setup は後方互換性のため
      if (customId === 'kpi_setup_store' || customId === 'kpi_setup') return await handleKpiSetup(interaction);
      if (customId === 'kpi_setup_approve_role') return await handleRoleSelectStart(interaction);

      // Store-specific KPI Panel buttons (from KPIPanel_Store.js)
      if (customId.startsWith('kpi_target_')) return await handleTargetModalOpen(interaction);
      if (customId.startsWith('kpi_summary_')) return await handleMonthlySummary(interaction);

      // KPI Report button (with role check)
      if (customId.startsWith('kpi_report_')) {
        const storeName = customId.replace('kpi_report_', '');
        const config = await getGuildConfig(guildId);
        const approveRoleId = config?.KPI?.[storeName]?.approveRole;
        const isAdmin = member.permissions.has('Administrator');

        if (approveRoleId && !isAdmin && !member.roles.cache.has(approveRoleId)) {
          return await interaction.reply({ content: `⚠️ あなたは店舗「${storeName}」のKPI申請権限を持っていません。`, flags: MessageFlags.Ephemeral });
        }
        return await handleReportModalOpen(interaction);
      }
    }

    // -------------------------------
    // セレクトメニュー (Select Menus)
    // -------------------------------
    if (interaction.isAnySelectMenu()) {
      // KPI Store Setup flow
      if (customId === 'kpi_select_store') return await handleStoreSetupSelect(interaction);
      if (customId.startsWith('kpi_select_channel_')) return await handleChannelSelect(interaction);

      // KPI Role Setup flow
      if (customId.startsWith('kpi_select_role_')) return await handleRoleSelectSubmit(interaction);

      // Legacy/Other Select Menus (from KPISelectors.js)
      if (customId.startsWith('kpi_role_')) return await handleLegacyRoleSelect(interaction);
      // Removed handleLegacyStoreSelect as handleStoreSetupSelect is for the setup flow
    }

    // -------------------------------
    // モーダル送信 (Modal Submissions)
    // -------------------------------
    if (interaction.isModalSubmit()) {
      if (customId.startsWith('kpi_target_modal_')) return await handleTargetModalSubmit(interaction);
      if (customId.startsWith('kpi_report_modal_')) return await handleReportModalSubmit(interaction);
    }

    // If no handler was found, it means the interaction was not meant for this handler
    // or it's an unhandled customId.
    // No explicit return here, let it fall through to the end if not handled.

  } catch (err) {
    logger.error('❌ KPIBotHandler エラー:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ 処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ 処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

module.exports = KPIBotHandler;
