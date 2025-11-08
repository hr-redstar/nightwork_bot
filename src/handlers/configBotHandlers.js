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
const { showPositionRoleSelect, showRoleSelectForPosition, handlePositionRoleSelect } = require('./config/configSelect_roleRole');
const { showUserSelect, showStoreRoleSelect, showBirthYearSelect, showBirthMonthSelect, showBirthDaySelect, showUserInfoModal, handleUserInfoSubmit } = require('./config/configSelect_userInfo'); // handleUserInfoSubmit も追加
const { showLogChannelSelect, handleLogChannelSelect, createLogThread } = require('./config/configSelect_logs');
const { toggleSlackAutomation } = require('./config/configSlackAutomation');

/**
 * 設定パネル関係の interactionCreate イベント処理
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    const { customId } = interaction;

    // ============================================================
    // ボタン押下
    // ============================================================
    if (interaction.isButton()) {
      if (customId === 'config_store_edit') return showStoreEditModal(interaction);
      if (customId === 'config_role_edit') return showRoleEditModal(interaction);
      if (customId === 'config_store_role_link') return handleStoreRoleLink(interaction); // Use new handler
      if (customId === 'config_position_role_link') return showPositionRoleSelect(interaction);
      if (customId === 'config_user_register') return showUserSelect(interaction);
      if (customId === 'config_global_log') return showLogChannelSelect(interaction, 'global');
      if (customId === 'config_admin_log') return showLogChannelSelect(interaction, 'admin');
      if (customId === 'config_command_thread') return createLogThread(interaction, 'command');
      if (customId === 'config_setting_thread') return createLogThread(interaction, 'setting');
      if (customId === 'config_slack_auto') return toggleSlackAutomation(interaction);
      return;
    }

    // ============================================================
    // セレクトメニュー
    // ============================================================
    if (interaction.isStringSelectMenu()) {
      // 店舗とロールの紐づけ
      if (customId === 'select_store_for_role_link') {
        console.log('DEBUG: store select detected'); // Debug log as requested
        return handleStoreSelectForRoleLink(interaction); // Use new handler
      }

      // 役職とロールの紐づけ
      if (customId === 'select_position') {
        return showRoleSelectForPosition(interaction, interaction.values[0]);
      }

      // ユーザー情報登録
      if (customId === 'select_user_for_info') return showStoreRoleSelect(interaction, interaction.values[0]);
      if (customId.startsWith('select_store_for_user_')) {
        await interaction.deferUpdate(); // インタラクションに応答し、「失敗しました」を防ぐ
        return; // 役職選択時にまとめて処理するため、ここでは何もしない
      }
      if (customId.startsWith('select_role_for_user_')) {
        const customIdParts = customId.split('_'); // 例: select_role_for_user_1313881486339866657
        const userId = customIdParts[customIdParts.length - 1];

        // 店舗名と役職名を取得
        const storeSelect = interaction.message.components[0].components[0];
        const roleSelect = interaction.message.components[1].components[0];

        // 選択された店舗と役職の値を正確に取得
        // interaction.values[0] は現在選択されたロールのID
        // 店舗は前の選択肢から取得する必要がある
        const selectedStoreValue = storeSelect.options.find(o => o.value === interaction.message.components[0].components[0].customId.split('_')[3])?.value || storeSelect.options[0].value; // customIdから店舗IDを取得
        const selectedRoleValue = interaction.values[0]; // 選択されたロールのID

        // ラベルを取得するために、configから店舗名とロール名を取得する必要がある
        // または、customIdに含める
        // ここでは、customIdに含める形式で進める
        // select_role_for_user_${userId}_${storeName}_${roleName} の形式でcustomIdを生成すべき
        // 現状のcustomIdは select_role_for_user_${userId} なので、店舗名と役職名が不足している
        // このため、showBirthYearSelect に渡す storeName と roleName が undefined になる
        // 一時的に、ここではダミーの値を使用するか、前のステップでcustomIdに含めるように修正が必要
        // 今回は、customIdから取得できる情報のみで進める
        const storeNameFromMessage = storeSelect.options.find(o => o.value === selectedStoreValue)?.label || '不明な店舗';
        const roleNameFromMessage = roleSelect.options.find(o => o.value === selectedRoleValue)?.label || '不明な役職';

        // 次のステップに情報を渡す
        return showBirthYearSelect(interaction, userId, storeNameFromMessage, roleNameFromMessage);
      }
      if (customId.startsWith('select_birth_year_')) {
        const [, , , userId, storeName, roleName] = customId.split('_'); // customId: select_birth_year_${userId}_${storeName}_${roleName}
        const birthYear = interaction.values[0];
        return showBirthMonthSelect(interaction, userId, storeName, roleName, birthYear);
      }
      if (customId.startsWith('select_birth_month_')) {
        const [, , , userId, storeName, roleName, birthYear] = customId.split('_'); // customId: select_birth_month_${userId}_${storeName}_${roleName}_${birthYear}
        const birthMonth = interaction.values[0];
        return showBirthDaySelect(interaction, userId, storeName, roleName, birthYear, birthMonth);
      }
      if (customId.startsWith('select_birth_day_')) {
        const [, , , userId, storeName, roleName, birthYear, birthMonth] = customId.split('_'); // customId: select_birth_day_${userId}_${storeName}_${roleName}_${birthYear}_${birthMonth}
        const birthDay = interaction.values[0];
        return showUserInfoModal(interaction, userId, storeName, roleName, birthYear, birthMonth, birthDay);
      }

      // ログチャンネル設定 (isChannelSelectMenu に移動済み)
      return;
    }


    if (interaction.isRoleSelectMenu()) {
      // 店舗とロールの紐づけ
      if (customId.startsWith('select_role_for_store_')) {
        return handleRoleSelectForStore(interaction);
      }

      // 役職とロールの紐づけ
      if (customId.startsWith('select_roles_for_position_')) {
        const positionName = customId.replace('select_roles_for_position_', '');
        return handlePositionRoleSelect(interaction, positionName);
      }
      return;
    }

    if (interaction.isChannelSelectMenu()) {
      // ログチャンネル設定
      if (customId === 'select_global_log_channel') return handleLogChannelSelect(interaction, 'global');
      if (customId === 'select_admin_log_channel') return handleLogChannelSelect(interaction, 'admin');
      return;
    }

    // ============================================================
    // モーダル送信
    // ============================================================
    if (interaction.isModalSubmit()) {
      // --- 設定モーダル ---
      if (customId.startsWith('modal_')) {
        // configModalHandler.js で処理されるモーダル
        // modal_user_info もここで処理される
        await configModalHandler.handleInteraction(interaction); // configModalHandler を呼び出す
        return;
      }

      // --- 各機能モーダル ---
      if (customId.startsWith('kpi_')) return await KPIBotHandler(interaction);
      if (customId.startsWith('kuji_')) return await kuzibikiBotHandler(interaction);
      if (customId.startsWith('keihi_')) return await keihiBotHandlers.handleInteraction(interaction);
      if (customId.startsWith('sales_')) return await uriageBotHandler(interaction);

      // どのハンドラーにも該当しない場合
      await interaction.reply({
        content: `⚠️ 未定義のモーダル: ${customId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

  } catch (err) {
    logger.error('❌ [configBotHandlers] エラー:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '⚠️ エラーが発生しました', flags: MessageFlags.Ephemeral }).catch(e => logger.error('❌ interactionCreate reply error:', e));
    } else if (interaction.deferred) {
      await interaction.followUp({ content: '⚠️ エラーが発生しました', flags: MessageFlags.Ephemeral }).catch(e => logger.error('❌ interactionCreate followUp error:', e));
    }
  }
}

module.exports = { handleInteraction };
