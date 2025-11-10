﻿/**
 * src/handlers/configBotHandlers.js
 * 設定パネルのボタン・セレクトメニューハンドラー
 */

const { MessageFlags } = require('discord.js'); // Keep this for error handling
const { handleStoreRoleLink } = require('./config/configStoreRoleLink.js');
const { handleStoreSelectForRoleLink } = require('./config/configStoreSelectForRoleLink.js');
const { handleRoleSelectForStore } = require('./config/configRoleSelectForStore.js');
const logger = require('../utils/logger');
const { showStoreEditModal, handleStoreEditSubmit } = require('./config/configModal_store');
const { showRoleEditModal, handleRoleEditSubmit } = require('./config/configModal_role');
const {
  showPositionRoleSelect,
  showRoleSelectForPosition,
  handlePositionRoleSelect,
} = require('./config/configSelect_roleRole');
const {
  showUserSelect,
  showStoreRoleSelect,
  showBirthYearSelect,
  showBirthMonthSelect,
  showBirthDaySelect,
  showUserInfoModal,
  handleUserInfoSubmit,
  handleStoreRoleSelect,
  decodeToken,
} = require('./config/configSelect_userInfo');
const { showLogChannelSelect, handleLogChannelSelect, createLogThread } = require('./config/configSelect_logs');
const { toggleSlackAutomation } = require('./config/configSlackAutomation');
const configModalHandler = require('./config/configModalHandler');
const KPIBotHandler = require('./KPIBotHandler');
const kuzibikiBotHandler = require('./kuzibikiBotHandler');
const keihiBotHandlers = require('./keihiBotHandlers');
const uriageBotHandler = require('./uriageBotHandler');

/**
 * 設定パネル関係の interactionCreate イベント処理
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>} 処理した場合は true、未処理なら false
 */
async function handleInteraction(interaction) {
  try {
    const { customId } = interaction;

    // ============================================================
    // ボタン押下
    // ============================================================
    if (interaction.isButton()) {
      if (customId === 'config_store_edit') {
        await showStoreEditModal(interaction);
        return true;
      }
      if (customId === 'config_role_edit') {
        await showRoleEditModal(interaction);
        return true;
      }
      if (customId === 'config_store_role_link') {
        await handleStoreRoleLink(interaction);
        return true;
      }
      if (customId === 'config_position_role_link') {
        await showPositionRoleSelect(interaction);
        return true;
      }
      if (customId === 'config_user_register') {
        await showUserSelect(interaction);
        return true;
      }
      if (customId === 'config_global_log') {
        await showLogChannelSelect(interaction, 'global');
        return true;
      }
      if (customId === 'config_admin_log') {
        await showLogChannelSelect(interaction, 'admin');
        return true;
      }
      if (customId === 'config_command_thread') {
        await createLogThread(interaction, 'command');
        return true;
      }
      if (customId === 'config_setting_thread') {
        await createLogThread(interaction, 'setting');
        return true;
      }
      if (customId === 'config_slack_auto') {
        await toggleSlackAutomation(interaction);
        return true;
      }
      return false;
    }

    // ============================================================
    // セレクトメニュー
    // ============================================================
    if (interaction.isStringSelectMenu()) {
      // 店舗とロールの紐づけ
      if (customId === 'select_store_for_role_link') {
        await handleStoreSelectForRoleLink(interaction);
        return true;
      }

      // 役職とロールの紐づけ
      if (customId === 'select_position') {
        await showRoleSelectForPosition(interaction, interaction.values[0]);
        return true;
      }

      // ユーザー情報登録
      if (customId === 'select_user_for_info') {
        await showStoreRoleSelect(interaction, interaction.values[0]);
        return true;
      }
      if (customId.startsWith('select_store_for_user_')) {
        const [, , , , userId] = customId.split('_');
        await handleStoreRoleSelect(interaction, userId);
        return true;
      }
      if (customId.startsWith('select_role_for_user_')) {
        const [, , , , userId, storeToken] = customId.split('_');
        const roleToken = interaction.values[0];
        const storeName = decodeToken(storeToken);
        const roleName = decodeToken(roleToken);

        await showBirthYearSelect(interaction, userId, storeName, roleName);
        return true;
      }
      if (customId.startsWith('select_birth_year_')) {
        const [, , , userId, storeToken, roleToken] = customId.split('_');
        const storeName = decodeToken(storeToken);
        const roleName = decodeToken(roleToken);
        const birthYear = interaction.values[0];
        await showBirthMonthSelect(interaction, userId, storeName, roleName, birthYear);
        return true;
      }
      if (customId.startsWith('select_birth_month_')) {
        const [, , , userId, storeToken, roleToken, birthYear] = customId.split('_');
        const storeName = decodeToken(storeToken);
        const roleName = decodeToken(roleToken);
        const birthMonth = interaction.values[0];
        await showBirthDaySelect(interaction, userId, storeName, roleName, birthYear, birthMonth);
        return true;
      }
      if (customId.startsWith('select_birth_day_')) {
        const [, , , userId, storeToken, roleToken, birthYear, birthMonth] = customId.split('_');
        const storeName = decodeToken(storeToken);
        const roleName = decodeToken(roleToken);
        const birthDay = interaction.values[0];
        await showUserInfoModal(interaction, userId, storeName, roleName, birthYear, birthMonth, birthDay);
        return true;
      }

      // ログチャンネル設定 (isChannelSelectMenu に移動済み)
      return false;
    }

    if (interaction.isRoleSelectMenu()) {
      // 店舗とロールの紐づけ
      if (customId.startsWith('select_role_for_store_')) {
        await handleRoleSelectForStore(interaction);
        return true;
      }

      // 役職とロールの紐づけ
      if (customId.startsWith('select_roles_for_position_')) {
        const positionName = customId.replace('select_roles_for_position_', '');
        await handlePositionRoleSelect(interaction, positionName);
        return true;
      }
      return false;
    }

    if (interaction.isChannelSelectMenu()) {
      // ログチャンネル設定
      if (customId === 'select_global_log_channel') {
        await handleLogChannelSelect(interaction, 'global');
        return true;
      }
      if (customId === 'select_admin_log_channel') {
        await handleLogChannelSelect(interaction, 'admin');
        return true;
      }
      return false;
    }

    // ============================================================
    // モーダル送信
    // ============================================================
    if (interaction.isModalSubmit()) {
      // --- 設定モーダル ---
      if (customId.startsWith('modal_user_info_')) {
        await handleUserInfoSubmit(interaction);
        return true;
      }
      if (customId.startsWith('modal_')) {
        // configModalHandler.js で処理されるモーダル
        await configModalHandler.handleInteraction(interaction);
        return true;
      }

      // --- 各機能モーダル ---
      if (customId.startsWith('kpi_')) {
        await KPIBotHandler(interaction);
        return true;
      }
      if (customId.startsWith('kuji_')) {
        await kuzibikiBotHandler(interaction);
        return true;
      }
      if (customId.startsWith('keihi_')) {
        await keihiBotHandlers.handleInteraction(interaction);
        return true;
      }
      if (customId.startsWith('sales_')) {
        await uriageBotHandler(interaction);
        return true;
      }

      // どのハンドラーにも該当しない場合
      await interaction.reply({
        content: `⚠️ 未定義のモーダル: ${customId}`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    return false;
  } catch (err) {
    logger.error('❌ [configBotHandlers] エラー:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '⚠️ エラーが発生しました', flags: MessageFlags.Ephemeral }).catch((e) =>
        logger.error('❌ interactionCreate reply error:', e)
      );
    } else if (interaction.deferred) {
      await interaction
        .followUp({ content: '⚠️ エラーが発生しました', flags: MessageFlags.Ephemeral })
        .catch((e) => logger.error('❌ interactionCreate followUp error:', e));
    }
    return true;
  }
}

module.exports = { handleInteraction };
