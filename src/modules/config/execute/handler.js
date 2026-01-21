﻿// src/modules/config/execute/handler.js
// ----------------------------------------------------
// 設定パネルのボタン / セレクト / モーダル dispatcher
// InteractionRouter 使用版
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const InteractionRouter = require('../../../structures/InteractionRouter');
const logger = require('../../../utils/logger');
const { getRegistrationState } = require('./select/user/registrationState.js');

// ==============================
// コンポーネントのインポート
// ==============================
// --- Button ---
const buttonStoreEdit = require('./components/button/button_store_edit.js');
const buttonRoleEdit = require('./components/button/button_role_edit.js');
const buttonStoreRoleLink = require('./components/button/button_store_role_link.js'); // This button triggers selectStoreForStoreRole.show
const buttonPositionRoleLink = require('./components/button/button_position_role_link.js');
const buttonUserRegister = require('./components/button/button_user_register.js');
const buttonCreateCommandThread = require('./components/button/log/button_create_command_thread.js');
const buttonCreateSettingThread = require('./components/button/log/button_create_setting_thread.js');
const buttonSlackAutomation = require('./components/modal/slack/button_slack_automation.js');
const { handleCommandRole } = require('./commandRoleHandler.js');

// --- Select ---
const selectStoreForStoreRole = require('./select/storeRole/select_store_for_storeRole.js');
const selectRolesForStore = require('./select/storeRole/select_roles_for_store.js');
const selectPositionForRoleLink = require('./select/positionRole/select_position_for_roleLink.js');
const selectRolesForPosition = require('./select/positionRole/select_roles_for_position.js');

const selectUserChooseMember = require('./select/user/select_user_chooseMember.js');
const selectUserChooseStore = require('./select/user/select_user_chooseStore.js');
const selectUserChoosePosition = require('./select/user/select_user_choosePosition.js');
const selectBirthYear = require('./select/user/select_user_birth_year.js');
const selectBirthMonth = require('./select/user/select_user_birth_month.js');
const selectBirthDay = require('./select/user/select_user_birth_day.js');

const selectGlobalLog = require('./select/log/select_global_log.js');
const selectAdminLog = require('./select/log/select_admin_log.js');

// --- Modal ---
const modalStoreEdit = require('./components/modal/modal_store_edit.js');
const modalRoleEdit = require('./components/modal/modal_role_edit.js');
const modalUserInfo = require('./components/modal/modal_user_info.js');
const modalSlackWebhook = require('./components/modal/slack/modal_slack_webhook.js');

// ==============================
// ルーター定義
// ==============================
const router = new InteractionRouter();

// --- Buttons ---
router.on('config:store:edit', (i) => buttonStoreEdit.execute(i));
router.on('config_store_edit', (i) => buttonStoreEdit.execute(i)); // Legacy

router.on('config:role:edit', (i) => buttonRoleEdit.execute(i));
router.on('config_role_edit', (i) => buttonRoleEdit.execute(i)); // Legacy

router.on('config:store:role:link', (i) => selectStoreForStoreRole.show(i));
router.on('config_store_role_link', (i) => selectStoreForStoreRole.show(i)); // Legacy

router.on('config:position:role:link', (i) => buttonPositionRoleLink.handle(i));
router.on('config_position_role_link', (i) => buttonPositionRoleLink.handle(i)); // Legacy

router.on('config:user:register', (i) => buttonUserRegister.execute(i));
router.on('config_user_register', (i) => buttonUserRegister.execute(i)); // Legacy

router.on('config:global:log', (i) => selectGlobalLog.show(i));
router.on('config_global_log', (i) => selectGlobalLog.show(i)); // Legacy

router.on('config:admin:log', (i) => selectAdminLog.show(i));
router.on('config_admin_log', (i) => selectAdminLog.show(i)); // Legacy

router.on('config:command:thread', (i) => buttonCreateCommandThread.handle(i));
router.on('config_command_thread', (i) => buttonCreateCommandThread.handle(i)); // Legacy

router.on('config:setting:thread', (i) => buttonCreateSettingThread.handle(i));
router.on('config_setting_thread', (i) => buttonCreateSettingThread.handle(i)); // Legacy

router.on('config:command:role', (i) => handleCommandRole(i));
router.on('config_command_role', (i) => handleCommandRole(i)); // Legacy

router.on('config:slack:auto', (i) => buttonSlackAutomation.handle(i));
router.on('config_slack_auto', (i) => buttonSlackAutomation.handle(i)); // Legacy

// --- User Registration Flow Buttons (Dynamic) ---
router.on(/^config_user_goto_position_/, async (i) => {
  const stateId = i.customId.replace('config_user_goto_position_', '');
  const state = getRegistrationState(stateId);
  if (!state) {
    await i.reply({ content: '⏳ セッションが期限切れです。再度最初から登録してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await selectUserChoosePosition.show(i, stateId, state.storeName);
});
router.on(/^config_user_goto_birth_year_/, async (i) => {
  const stateId = i.customId.replace('config_user_goto_birth_year_', '');
  const state = getRegistrationState(stateId);
  if (!state) {
    await i.reply({ content: '⏳ セッションが期限切れです。再度最初から登録してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await selectBirthYear.show(i, stateId);
});
router.on(/^config_user_goto_userinfo_/, async (i) => {
  const stateId = i.customId.replace('config_user_goto_userinfo_', '');
  const state = getRegistrationState(stateId);
  if (!state) {
    await i.reply({ content: '⏳ セッションが期限切れです。再度最初から登録してください。', flags: MessageFlags.Ephemeral });
    return;
  }
  await modalUserInfo.show(i, stateId);
});
router.on(/^config_user_birth_year_next__/, (i) => selectBirthYear.handleNext(i));
router.on(/^config_user_birth_month_next__/, (i) => selectBirthMonth.handleNext(i));
router.on(/^config_user_birth_day_next__/, (i) => selectBirthDay.handleNext(i));


// --- Select Menus ---
// config_command_role_select is handled by collector, so no direct router entry needed.
router.on('config_select_store_for_store_role_value', (i) => selectStoreForStoreRole.handle(i));
router.on(/^config_select_roles_for_store_value_/, (i) => selectRolesForStore.handle(i));
router.on('config_select_position_for_role_link_value', (i) => selectPositionForRoleLink.handle(i));
router.on(/^config_select_roles_for_position_value_/, (i) => selectRolesForPosition.handle(i));

router.on('config_user_select_member', (i) => selectUserChooseMember.handle(i));
router.on(/^config_user_select_store_/, (i) => selectUserChooseStore.handle(i));
router.on(/^config_user_select_position_/, (i) => selectUserChoosePosition.handle(i));
router.on(/^config_user_select_birth_year_/, (i) => selectBirthYear.handle(i));
router.on(/^config_user_select_birth_month_/, (i) => selectBirthMonth.handle(i));
router.on(/^config_user_select_birth_day_/, (i) => selectBirthDay.handle(i));

router.on('config_select_global_log_value', (i) => selectGlobalLog.handle(i));
router.on('config_select_admin_log_value', (i) => selectAdminLog.handle(i));

// --- Modals ---
router.on('config_store_edit_modal', (i) => modalStoreEdit.handle(i));
router.on('config_role_edit_modal', (i) => modalRoleEdit.handle(i));
router.on(/^config_user_info_modal_/, (i) => modalUserInfo.handle(i));
router.on('config_slack_webhook_modal_submit', (i) => modalSlackWebhook.handle(i));


// =====================================================
// handleInteraction（共通 dispatcher）
// =====================================================
async function handleInteraction(interaction) {
  try {
    const handled = await router.dispatch(interaction);
    if (!handled) {
      logger.debug(`[Config] Unhandled interaction: ${interaction.customId}`);
    }
    return handled;
  } catch (err) {
    logger.error('[configBotHandlers] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ 設定パネル処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
    return false;
  }
}

module.exports = {
  handleInteraction,
};
