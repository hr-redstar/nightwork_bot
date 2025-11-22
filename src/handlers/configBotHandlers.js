﻿// src/handlers/configBotHandlers.js
// ----------------------------------------------------
// 設定パネルのボタン / セレクト / モーダル dispatcher
// ----------------------------------------------------

const logger = require('../utils/logger');

// ==============================
// ボタン
// ==============================
const buttonStoreEdit = require('./config/components/button/button_store_edit.js');
const buttonRoleEdit = require('./config/components/button/button_role_edit.js');
const buttonStoreRoleLink = require('./config/components/button/button_store_role_link.js');
const buttonPositionRoleLink = require('./config/components/button/button_position_role_link.js');
const buttonUserRegister = require('./config/components/button/button_user_register.js');
const buttonCreateCommandThread = require('./config/components/button/log/button_create_command_thread.js');
const buttonCreateSettingThread = require('./config/components/button/log/button_create_setting_thread.js');
const buttonSlackAutomation = require('./config/components/modal/slack/button_slack_automation.js');

// ==============================
// セレクト
// ==============================
const selectStoreForStoreRole = require('./config/select/storeRole/select_store_for_storeRole.js');
const selectRolesForStore = require('./config/select/storeRole/select_roles_for_store.js');

const selectPositionForRoleLink = require('./config/select/positionRole/select_position_for_roleLink.js');
const selectRolesForPosition = require('./config/select/positionRole/select_roles_for_position.js');

const selectUserChooseMember = require('./config/select/user/select_user_chooseMember.js');
const selectUserChooseStore = require('./config/select/user/select_user_chooseStore.js');
const selectUserChoosePosition = require('./config/select/user/select_user_choosePosition.js');
const selectBirthYear = require('./config/select/user/select_user_birth_year.js');
const selectBirthMonth = require('./config/select/user/select_user_birth_month.js');
const selectBirthDay = require('./config/select/user/select_user_birth_day.js');

const selectGlobalLog = require('./config/select/log/select_global_log.js');
const selectAdminLog = require('./config/select/log/select_admin_log.js');

// ==============================
// モーダル
// ==============================
const modalStoreEdit = require('./config/components/modal/modal_store_edit.js');
const modalRoleEdit = require('./config/components/modal/modal_role_edit.js');
const modalUserInfo = require('./config/components/modal/modal_user_info.js');
const modalSlackWebhook = require('./config/components/modal/slack/modal_slack_webhook.js');

// =====================================================
// handleInteraction（共通 dispatcher）
// =====================================================

async function handleInteraction(interaction) {
  try {
    const id = interaction.customId;

    // --------------------------------
    // BUTTON
    // --------------------------------
    if (interaction.isButton()) {
      if (id === 'config_store_edit') { await buttonStoreEdit.execute(interaction); return true; }
      if (id === 'config_role_edit') { await buttonRoleEdit.execute(interaction); return true; }

      if (id === 'config_store_role_link') { await selectStoreForStoreRole.show(interaction); return true; }
      if (id === 'config_position_role_link') { await buttonPositionRoleLink.handle(interaction); return true; }

      
      if (id === 'config_user_register') { await buttonUserRegister.execute(interaction); return true; }

      if (id === 'config_global_log') { await selectGlobalLog.show(interaction); return true; }
      if (id === 'config_admin_log') { await selectAdminLog.show(interaction); return true; }

      if (id === 'config_command_thread') { await buttonCreateCommandThread.handle(interaction); return true; }
      if (id === 'config_setting_thread') { await buttonCreateSettingThread.handle(interaction); return true; }

      if (id === 'config_slack_auto') { await buttonSlackAutomation.handle(interaction); return true; }

      // --- ユーザー登録フローの「次へ」ボタン ---
      if (id.startsWith('CONFIG_USER_GOTO_POSITION_')) {
        const parts = id.replace('CONFIG_USER_GOTO_POSITION_', '').split('_');
        const userId = parts[0];
        const storeName = parts.slice(1).join('_');
        await selectUserChoosePosition.show(interaction, userId, storeName);
        return true;
      }
      if (id.startsWith('CONFIG_USER_GOTO_BIRTH_YEAR_')) {
        const parts = id.replace('CONFIG_USER_GOTO_BIRTH_YEAR_', '').split('_');
        const [userId, storeName, positionId] = parts;
        await selectBirthYear.show(interaction, userId, storeName, positionId);
        return true;
      }
      if (id.startsWith('CONFIG_USER_GOTO_USERINFO_')) {
        const raw = id.replace('CONFIG_USER_GOTO_USERINFO_', '');
        const parts = raw.split('_');
        const [userId, storeName, positionId, year, month, day] = parts;
        await modalUserInfo.show(interaction, userId, storeName, positionId, year, month, day);
        return true;
      }
    }

    // --------------------------------
    // SELECT MENUS
    // --------------------------------
    if (interaction.isAnySelectMenu()) {
      if (id === 'CONFIG_SELECT_STORE_FOR_STORE_ROLE_VALUE') {
        await selectStoreForStoreRole.handle(interaction); return true;
      }
      if (id.startsWith('CONFIG_SELECT_ROLES_FOR_STORE_VALUE_')) {
        await selectRolesForStore.handle(interaction); return true;
      }

      if (id === 'CONFIG_SELECT_POSITION_FOR_ROLE_LINK_VALUE') {
        await selectPositionForRoleLink.handle(interaction); return true;
      }
      if (id.startsWith('CONFIG_SELECT_ROLES_FOR_POSITION_VALUE_')) {
        await selectRolesForPosition.handle(interaction); return true;
      }

      if (id === 'CONFIG_USER_SELECT_MEMBER') { await selectUserChooseMember.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_STORE_')) { await selectUserChooseStore.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_POSITION_')) { await selectUserChoosePosition.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_YEAR_')) { await selectBirthYear.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_')) { await selectBirthYear.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_MONTH_')) { await selectBirthMonth.handle(interaction); return true; }
      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_DAY_')) { await selectBirthDay.handle(interaction); return true; }

      if (id === 'CONFIG_SELECT_GLOBAL_LOG_VALUE') { await selectGlobalLog.handle(interaction); return true; }
      if (id === 'CONFIG_SELECT_ADMIN_LOG_VALUE') { await selectAdminLog.handle(interaction); return true; }
    }

    // --------------------------------
    // MODALS
    // --------------------------------
    if (interaction.isModalSubmit()) {
      if (id === 'modal_store_edit' || id === 'CONFIG_STORE_EDIT_MODAL') { await modalStoreEdit.handle(interaction); return true; }
      if (id === 'modal_role_edit' || id === 'CONFIG_ROLE_EDIT_MODAL') { await modalRoleEdit.handle(interaction); return true; }

      if (id.startsWith('CONFIG_USER_INFO_MODAL_')) { await modalUserInfo.handle(interaction); return true; }

      if (id === 'CONFIG_SLACK_WEBHOOK_MODAL_SUBMIT') { await modalSlackWebhook.handle(interaction); return true; }
    }

    return false; // 未処理
  } catch (err) {
    logger.error('[configBotHandlers] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ 設定パネル処理中にエラーが発生しました。',
        ephemeral: true,
      });
    }
  }
}

module.exports = handleInteraction;
