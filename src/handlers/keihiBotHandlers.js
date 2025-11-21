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
} = require("./keihi/keihiRequestHandler");

// ----------------------------------------------------
// 経費修正処理
// ----------------------------------------------------
const {
  openModifyModal,
  submitModify,
} = require("./keihi/keihiModifyHandler");

// ----------------------------------------------------
// 経費承認 / 削除処理（後で実装）
// ----------------------------------------------------
const { approveKeihi } = require("./keihi/keihiApproveHandler");
const { deleteKeihi } = require("./keihi/keihiDeleteHandler");

// ----------------------------------------------------
// 経費パネル設置（設定パネル → 店舗/チャンネル選択）
// ----------------------------------------------------
const {
  openStoreSelect,
  openChannelSelect,
  placePanel,
} = require("./keihi/keihiPanel_setup");

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

      // ------------------------------------------------------
      // ※ 承認処理（keihi_approve:）は後で追加予定
      // ※ 削除処理（keihi_delete:）は後で追加予定
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
