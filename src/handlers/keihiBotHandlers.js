﻿// src/handlers/keihiBotHandlers.js
// ----------------------------------------------------
// 経費機能のルーティング一括管理
// ----------------------------------------------------

const logger = require("../utils/logger");

// 経費パネル設置フロー
const {
  openStoreSelect,
  openChannelSelect,
  placePanel,
  postKeihiSettingPanel,
} = require("./keihi/setting/keihiPanelHandler");

// 経費項目登録
const {
  openItemModal,
  submitItemModal,
} = require("./keihi/setting/keihiItemHandler");

// 経費申請フロー
const {
  startKeihiRequest,
  openKeihiModal,
  submitKeihiRequest,
} = require("./keihi/request/keihiRequestHandler");

// 経費修正・削除フロー
const {
  openModifyModal,
  submitModify,
} = require("./keihi/request/keihiModifyHandler");

// 役職設定フロー
const {
  openRoleSelect,
  saveRoles,
} = require("./keihi/setting/keihiRoleHandler");

module.exports = {
  /**
   * 経費機能のすべての interaction をここでまとめて処理
   * @param {import('discord.js').Interaction} interaction
   * @returns {Promise<boolean>} このハンドラが処理したら true / 対象外なら false
   */
  async handleInteraction(interaction) {
    const { customId } = interaction;

    try {
      // ==================== 経費設定パネルの操作 ====================

      // 経費パネル設置ボタン
      if (customId === "keihi_panel_setup") {
        await openStoreSelect(interaction);
        return true;
      }

      // 店舗選択
      if (customId === "keihi_panel_store") {
        const store = interaction.values?.[0];
        if (!store) {
          await interaction.reply({
            content: "⚠️ 店舗が選択されていません。",
            ephemeral: true,
          });
          return true;
        }
        await openChannelSelect(interaction, store);
        return true;
      }

      // チャンネル選択
      if (customId.startsWith("keihi_panel_channel:")) {
        const store = customId.split(":")[1];
        await placePanel(interaction, store);
        return true;
      }

      // ==================== 経費申請パネルの操作（項目登録） ====================

      // 経費項目登録ボタン
      if (customId.startsWith("keihi_item:")) {
        const store = customId.split(":")[1];
        await openItemModal(interaction, store);
        return true;
      }

      // 経費項目モーダル送信
      if (customId.startsWith("keihi_item_modal:")) {
        const store = customId.split(":")[1];
        await submitItemModal(interaction, store);
        return true;
      }

      // ==================== 経費申請フロー ====================

      // 「経費申請」ボタン
      if (customId.startsWith("keihi_request:")) {
        const store = customId.split(":")[1];
        await startKeihiRequest(interaction, store);
        return true;
      }

      // 経費項目選択
      if (customId.startsWith("keihi_request_item:")) {
        const store = customId.split(":")[1];
        const item = interaction.values[0];
        await openKeihiModal(interaction, store, item);
        return true;
      }

      // 経費申請モーダル送信
      if (customId.startsWith("keihi_request_modal:")) {
        // customId: keihi_request_modal:<store>:<item>
        const [_, store, item] = customId.split(":");
        await submitKeihiRequest(interaction, store, item);
        return true;
      }

      // ==================== 経費修正・削除フロー ====================

      // 「修正」ボタン
      if (customId.startsWith("keihi_modify:")) {
        const store = customId.split(":")[1];
        await openModifyModal(interaction, store);
        return true;
      }

      // 修正モーダル送信
      if (customId.startsWith("keihi_modify_modal:")) {
        const store = customId.split(":")[1];
        await submitModify(interaction, store);
        return true;
      }

      // ==================== 役職設定フロー ====================

      // --- 経費設定パネルの役職設定 ---
      if (customId === "keihi_role_approval") {
        await openRoleSelect(interaction, "approval");
        return true;
      }

      // --- 経費申請パネルの役職設定 ---
      if (customId === "keihi_role_view") {
        // 本来は keihi_view_role:<store> のはずだが、一旦グローバルとして扱う
        await openRoleSelect(interaction, "view");
        return true;
      }
      if (customId === "keihi_role_apply") {
        // 本来は keihi_apply_role:<store> のはずだが、一旦グローバルとして扱う
        await openRoleSelect(interaction, "apply");
        return true;
      }

      // --- 役職選択セレクトメニューの確定 ---
      if (customId.startsWith("keihi_role_select:")) {
        const type = customId.split(":")[1]; // approval / view / apply
        await saveRoles(interaction, type);
        // 役職設定後にパネルを更新
        await postKeihiSettingPanel(interaction);
        return true;
      }

      // ここまで来たら経費ハンドラの担当外
      return false;
    } catch (err) {
      logger.error("[KeihiBotHandlers] Interaction処理エラー:", err);

      const reply = {
        content: "⚠️ 経費処理中にエラーが発生しました。",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }

      return true;
    }
  },
};
