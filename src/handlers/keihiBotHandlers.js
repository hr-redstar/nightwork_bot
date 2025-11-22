﻿// src/handlers/keihiBotHandlers.js
// ----------------------------------------------------
// 経費機能のルーティング一括管理
// ----------------------------------------------------

const logger = require("../utils/logger");

// ----------------------------------------------------
// 経費申請（初回）
// ----------------------------------------------------
const {
  startKeihiRequest,
  openKeihiModal,
  submitKeihiRequest,
} = require("./keihi/request/keihiRequestHandler");

// ----------------------------------------------------
// 経費修正処理
// ----------------------------------------------------
const {
  openModifyModal,
  submitModify,
} = require("./keihi/request/keihiModifyHandler");

// ----------------------------------------------------
// 経費承認 / 削除処理（後で実装）
// ----------------------------------------------------
const { approveKeihi } = require("./keihi/request/keihiApproveHandler.js");
const { deleteKeihi } = require("./keihi/request/keihiDeleteHandler.js");

// ----------------------------------------------------
// 経費項目登録
// ----------------------------------------------------
// const { openItemRegisterModal, handleItemRegisterSubmit } = require('./keihi/keihiItemHandler.js');

// ----------------------------------------------------
// 経費パネル設置（設定パネル → 店舗/チャンネル選択）
// ----------------------------------------------------
const {
  openStoreSelect,
  openChannelSelect,
  placePanel,
} = require("./keihi/setting/keihiPanelHandler");

// ----------------------------------------------------
// 経費ロール設定
// ----------------------------------------------------
const { openRoleSelect } = require('./keihi/setting/keihiRoleHandler');

// ----------------------------------------------------
// 経費CSV発行
// ----------------------------------------------------
const { selectStoreForCsv, selectPeriod, exportCsv } = require('./keihi/setting/keihiCsvHandler');


module.exports = {
  /**
   * 経費機能の全 interaction をここで一括ハンドリング
   */
  async handleInteraction(interaction) {
    const { customId } = interaction;

    try {
      // ===================================================
      // ① 経費申請ボタン（経費申請パネル → 申請開始）
      // ===================================================
      // 店舗別パネルからの申請開始
      if (customId.startsWith("keihi:panel:request_open:")) {
        const store = customId.split(":")[3];
        return startKeihiRequest(interaction, store);
      }
      // (旧ID, 後方互換性のため残す)
      if (customId.startsWith("keihi_request:")) {
        const store = customId.split(":")[1];
        return startKeihiRequest(interaction, store);
      }

      // ===================================================
      // ② 経費項目の選択メニュー
      // ===================================================
      if (customId.startsWith("keihi_request_item:")) {
        const store = customId.split(":")[1];
        const item = interaction.values?.[0];
        return openKeihiModal(interaction, store, item);
      }

      // ===================================================
      // ③ 経費申請モーダル送信
      // ===================================================
      if (customId.startsWith("keihi_request_modal:")) {
        const parts = customId.split(":");
        const store = parts[1];
        const item = parts[2];
        return submitKeihiRequest(interaction, store, item);
      }

      // ===================================================
      // ④ 修正ボタン（スレッド内）
      // ===================================================
      if (customId.startsWith("keihi_modify:")) {
        const store = customId.split(":")[1];
        return openModifyModal(interaction, store);
      }

      // ===================================================
      // ⑤ 修正モーダル送信
      // ===================================================
      if (customId.startsWith("keihi_modify_modal:")) {
        const store = customId.split(":")[1];
        return submitModify(interaction, store);
      }

      // ===================================================
      // ⑥ 経費パネル設置フロー（設定パネル）
      // ===================================================

      // STEP1：パネル設置ボタン
      if (customId === "keihi_panel_setup") {
        return openStoreSelect(interaction);
      }

      // STEP2：店舗選択
      if (customId === "keihi_panel_store_select") {
        const store = interaction.values?.[0];
        if (!store) {
          return interaction.reply({
            content: "⚠️ 店舗を取得できませんでした。",
            ephemeral: true,
          });
        }
        return openChannelSelect(interaction, store);
      }

      // STEP3：チャンネル選択
      if (customId.startsWith("keihi_panel_channel:")) {
        const store = customId.split(":")[1];
        return placePanel(interaction, store);
      }

      // ===================================================
      // ⑦ ロール設定（承認・閲覧・申請）
      // ===================================================
      if (customId === 'keihi_role_approval') {
        return openRoleSelect(interaction, 'approval', '承認役職');
      }
      if (customId.startsWith('keihi:config:store_role_viewer:')) {
        const storeName = customId.split(':')[3];
        return openRoleSelect(interaction, 'viewer', `[${storeName}] 閲覧役職`, storeName);
      }
      if (customId.startsWith('keihi:config:store_role_applicant:')) {
        const storeName = customId.split(':')[3];
        return openRoleSelect(interaction, 'applicant', `[${storeName}] 申請役職`, storeName);
      }

      // ===================================================
      // ⑧ CSV発行フロー
      // ===================================================
      if (customId === 'keihi_csv_export') {
        return selectStoreForCsv(interaction);
      }
      if (customId === 'keihi_csv_select_store') {
        const store = interaction.values?.[0];
        return selectPeriod(interaction, store);
      }
      if (customId.startsWith('keihi_csv_select_period:')) {
        const [_, store, type, key] = customId.split(':');
        return exportCsv(interaction, store, type, key);
      }

      // ===================================================
      // ⑨ スレッド内ボタン（承認・削除）
      // ===================================================
      if (customId.startsWith('keihi_approve:')) {
        return approveKeihi(interaction);
      }
      if (customId.startsWith('keihi_delete:')) {
        return deleteKeihi(interaction);
      }

      // ===================================================
      // ⑩ 店舗別パネルからの操作（経費項目登録）
      // ===================================================
      if (customId.startsWith('keihi:item:register:')) {
        const storeName = customId.split(':')[3];
        return openItemRegisterModal(interaction, storeName);
      }
      if (customId.startsWith('keihi:item:submit:')) {
        return handleItemRegisterSubmit(interaction);
      }
      // ------------------------------------------------------
      // ------------------------------------------------------

      return false; // 経費関連ではない

    } catch (err) {
      logger.error("[KeihiHandlers] エラー:", err);

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "⚠️ 経費処理中にエラーが発生しました。",
          ephemeral: true,
        });
      }

      return true;
    }
  },
};
