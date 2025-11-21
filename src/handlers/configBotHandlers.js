﻿// src/handlers/configBotHandlers.js
// ----------------------------------------------------
// 設定パネルのボタン / セレクト / モーダル dispatcher
// ----------------------------------------------------

const logger = require('../utils/logger');

// ==============================
// ボタン
// ==============================
const buttonStoreEdit = require('./config/components/button/button_store_edit');
const buttonRoleEdit = require('./config/components/button/button_role_edit');
const buttonStoreRoleLink = require('./config/components/button/button_store_role_link');
const buttonUserRegister = require('./config/components/button/button_user_register');
const buttonCreateCommandThread = require('./config/components/button/log/button_create_command_thread');
const buttonCreateSettingThread = require('./config/components/button/log/button_create_setting_thread');
const buttonSlackAutomation = require('./config/components/modal/slack/button_slack_automation');

// ==============================
// セレクト
// ==============================
const selectStoreForStoreRole = require('./config/select/storeRole/select_store_for_storeRole');
const selectRolesForStore = require('./config/select/storeRole/select_roles_for_store');

const selectPositionForRoleLink = require('./config/select/positionRole/select_position_for_roleLink');
const selectRolesForPosition = require('./config/select/positionRole/select_roles_for_position');

const selectUserChooseMember = require('./config/select/user/select_user_chooseMember');
const selectUserChooseStore = require('./config/select/user/select_user_chooseStore');
const selectUserChoosePosition = require('./config/select/user/select_user_choosePosition');
const selectBirthYear = require('./config/select/user/select_user_birth_year');
const selectBirthYearExtra = require('./config/select/user/select_user_birth_year_extra');
const selectBirthMonth = require('./config/select/user/select_user_birth_month');
const selectBirthDay = require('./config/select/user/select_user_birth_day');

const selectGlobalLog = require('./config/select/log/select_global_log');
const selectAdminLog = require('./config/select/log/select_admin_log');

// ==============================
// モーダル
// ==============================
const modalStoreEdit = require('./config/components/modal/modal_store_edit');
const modalRoleEdit = require('./config/components/modal/modal_role_edit');
const modalUserInfo = require('./config/components/modal/modal_user_info');
const modalSlackWebhook = require('./config/components/modal/slack/modal_slack_webhook');

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
      if (id === 'config_store_edit') return modalStoreEdit.show(interaction);
      if (id === 'config_role_edit') return modalRoleEdit.show(interaction);

      if (id === 'config_store_role_link') return selectStoreForStoreRole.show(interaction);

      if (id === 'config_user_register') return buttonUserRegister.execute(interaction);

      if (id === 'config_global_log') return selectGlobalLog.show(interaction);
      if (id === 'config_admin_log') return selectAdminLog.show(interaction);

      if (id === 'config_command_thread') return buttonCreateCommandThread.handle(interaction);
      if (id === 'config_setting_thread') return buttonCreateSettingThread.handle(interaction);

      if (id === 'config_slack_auto') return buttonSlackAutomation.handle(interaction);
    }

    // --------------------------------
    // SELECT MENUS
    // --------------------------------
    if (interaction.isAnySelectMenu()) {
      if (id === 'CONFIG_SELECT_STORE_FOR_STORE_ROLE_VALUE')
        return selectStoreForStoreRole.handle(interaction);

      if (id.startsWith('CONFIG_SELECT_ROLES_FOR_STORE_VALUE_'))
        return selectRolesForStore.handle(interaction);

      if (id.startsWith('CONFIG_SELECT_ROLES_FOR_POSITION_VALUE_'))
        return selectRolesForPosition.handle(interaction);

      if (id === 'CONFIG_USER_SELECT_MEMBER')
        return selectUserChooseMember.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_STORE_'))
        return selectUserChooseStore.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_POSITION_'))
        return selectUserChoosePosition.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_YEAR_'))
        return selectBirthYear.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_'))
        return selectBirthYearExtra.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_MONTH_'))
        return selectBirthMonth.handle(interaction);

      if (id.startsWith('CONFIG_USER_SELECT_BIRTH_DAY_'))
        return selectBirthDay.handle(interaction);

      if (id === 'CONFIG_SELECT_GLOBAL_LOG_VALUE')
        return selectGlobalLog.handle(interaction);

      if (id === 'CONFIG_SELECT_ADMIN_LOG_VALUE')
        return selectAdminLog.handle(interaction);
    }

    // --------------------------------
    // MODALS
    // --------------------------------
    if (interaction.isModalSubmit()) {
      if (id === 'modal_store_edit') return modalStoreEdit.handle(interaction);
      if (id === 'modal_role_edit') return modalRoleEdit.handle(interaction);

      if (id.startsWith('CONFIG_USER_INFO_MODAL_'))
        return modalUserInfo.handle(interaction);

      if (id === 'CONFIG_SLACK_WEBHOOK_MODAL_SUBMIT')
        return modalSlackWebhook.handle(interaction);
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

module.exports = { handleInteraction };
