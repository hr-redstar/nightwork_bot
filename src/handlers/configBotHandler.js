﻿﻿﻿// src/handlers/configBotHandler.js
// ----------------------------------------------------
// 設定パネルのボタン / セレクト / モーダル dispatcher
// ----------------------------------------------------

const { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');

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
const { handleCommandRole } = require('./config/commandRoleHandler.js');

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
const logger = require('../utils/logger');
const {
  getRegistrationState,
} = require('./config/select/user/registrationState.js');

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


      if (id === 'config_command_role') { await handleCommandRole(interaction); return true; }

      if (id === 'config_slack_auto') { await buttonSlackAutomation.handle(interaction); return true; }

      // --- ユーザー登録フローの「次へ」ボタン ---
      if (id.startsWith('config_user_goto_position_')) {
        const stateId = id.replace('config_user_goto_position_', '');
        const state = getRegistrationState(stateId);
        if (!state) {
          await interaction.reply({
            content: '⏳ セッションが期限切れです。再度最初から登録してください。',
            flags: MessageFlags.Ephemeral,
          });
          return true;
        }
        await selectUserChoosePosition.show(interaction, stateId, state.storeName);
        return true;
      }
      if (id.startsWith('config_user_goto_birth_year_')) {
        const stateId = id.replace('config_user_goto_birth_year_', '');
        const state = getRegistrationState(stateId);
        if (!state) {
          await interaction.reply({
            content: '⏳ セッションが期限切れです。再度最初から登録してください。',
            flags: MessageFlags.Ephemeral,
          });
          return true;
        }
        await selectBirthYear.show(interaction, stateId);
        return true;
      }
      if (id.startsWith('config_user_goto_userinfo_')) {
        const stateId = id.replace('config_user_goto_userinfo_', '');
        const state = getRegistrationState(stateId);
        if (!state) {
          await interaction.reply({
            content: '⏳ セッションが期限切れです。再度最初から登録してください。',
            flags: MessageFlags.Ephemeral,
          });
          return true;
        }
        await modalUserInfo.show(interaction, stateId);
        return true;
      }

      // 誕生年「次へ」ボタン
      if (id.startsWith('config_user_birth_year_next__')) {
        return selectBirthYear.handleNext(interaction);
      }
      // 誕生月「次へ」ボタン
      if (id.startsWith('config_user_birth_month_next__')) {
        return selectBirthMonth.handleNext(interaction);
      }
      // 誕生日「次へ」ボタン
      if (id.startsWith('config_user_birth_day_next__')) {
        return selectBirthDay.handleNext(interaction);
      }
    }

    // --------------------------------
    // SELECT MENUS
    // --------------------------------
    if (interaction.isAnySelectMenu()) {
      if (id === 'config_command_role_select') {
        // このセレクトメニューはcollectorで処理済み
        return false;
      }
      if (id === 'config_select_store_for_store_role_value') { 
         await selectStoreForStoreRole.handle(interaction); return true;
      }
      if (id.startsWith('config_select_roles_for_store_value_')) {
        await selectRolesForStore.handle(interaction); return true;
      }

      if (id === 'config_select_position_for_role_link_value') {
        await selectPositionForRoleLink.handle(interaction); return true;
      }
      if (id.startsWith('config_select_roles_for_position_value_')) {
        await selectRolesForPosition.handle(interaction); return true;
      }

      if (id === 'config_user_select_member') { await selectUserChooseMember.handle(interaction); return true; }
      if (id.startsWith('config_user_select_store_')) { await selectUserChooseStore.handle(interaction); return true; }
      if (id.startsWith('config_user_select_position_')) { await selectUserChoosePosition.handle(interaction); return true; }
      if (id.startsWith('config_user_select_birth_year_')) { await selectBirthYear.handle(interaction); return true; }
      if (id.startsWith('config_user_select_birth_month_')) { await selectBirthMonth.handle(interaction); return true; }
      if (id.startsWith('config_user_select_birth_day_')) { await selectBirthDay.handle(interaction); return true; }

      if (id === 'config_select_global_log_value') { await selectGlobalLog.handle(interaction); return true; }
      if (id === 'config_select_admin_log_value') { await selectAdminLog.handle(interaction); return true; }
    }

    // --------------------------------
    // MODALS
    // --------------------------------
    if (interaction.isModalSubmit()) {
      if (id === 'config_store_edit_modal') {  await modalStoreEdit.handle(interaction); return true; }
      if (id === 'config_role_edit_modal') { await modalRoleEdit.handle(interaction); return true; }

      if (id.startsWith('config_user_info_modal_')) { await modalUserInfo.handle(interaction); return true; }

      if (id === 'config_slack_webhook_modal_submit') { await modalSlackWebhook.handle(interaction); return true; }
    }

    return false; // 未処理
  } catch (err) {
    logger.error('[configBotHandlers] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ 設定パネル処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

module.exports = {
  handleInteraction,
};
