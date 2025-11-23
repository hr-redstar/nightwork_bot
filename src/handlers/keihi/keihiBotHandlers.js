// src/handlers/keihi/keihiBotHandlers.js
// ----------------------------------------------------
// 経費機能のルーティング一括管理
//   ・経費設定パネルからの「経費パネル設置」フロー
//   （承認 / 申請フローは後で追加）
// ----------------------------------------------------

const logger = require("../../utils/logger");
const { MessageFlags } = require("discord.js");

// 経費パネル設置フロー
const {
  openStoreSelect,
  openChannelSelect,
  placePanel,
} = require("./setting/keihiPanelHandler");

// 役職設定
const {
  openRoleSelect,
  saveRoles,
} = require("./setting/keihiRoleHandler");

// 経費申請
// const {
//   startKeihiRequest,
//   openKeihiModal,
//   submitKeihiRequest,
// } = require("./request/KeihiPanel_Request");

module.exports = {
  /**
   * 経費機能の全 interaction をここでハンドリング
   * @param {import('discord.js').Interaction} interaction
   * @returns {Promise<boolean>} このハンドラで処理したら true / 対象外なら false
   */
  async handleInteraction(interaction) {
    const { customId } = interaction;

    try {
      // =====================================================
      // 📌 経費設定パネルの操作
      // =====================================================

      // ① 「経費パネル設置」ボタン
      if (customId === "keihi_panel_setup") {
        await openStoreSelect(interaction);
        return true;
      }

      // ② 店舗選択（StringSelectMenu）
      if (customId === "keihi_panel_store") {
        const store = interaction.values?.[0];
        if (!store) {
          await interaction.reply({
            content: "⚠️ 店舗が選択されていません。",
            flags: [MessageFlags.Ephemeral],
          });
          return true;
        }
        await openChannelSelect(interaction, store);
        return true;
      }

      // ③ チャンネル選択（ChannelSelectMenu）
      if (customId.startsWith("keihi_panel_channel:")) {
        const store = customId.split(":")[1];
        await placePanel(interaction, store);
        return true;
      }

      // ④ 「承認役職」ボタン
      if (customId === "keihi_role_approval") {
        await openRoleSelect(interaction, "approval");
        return true;
      }

      // ⑤ 役職選択（RoleSelectMenu）
      if (customId.startsWith("keihi_role_select:")) {
        const type = customId.split(":")[1];
        await saveRoles(interaction, type);
        return true;
      }

      // ⑥ 「経費CSV発行」ボタン
      if (customId === "keihi_csv_export") {
        await interaction.reply({
          content: "🚧 この機能は現在開発中です。",
          flags: [MessageFlags.Ephemeral],
        });
        return true;
      }

      // =====================================================
      // （ここに今後：経費申請フロー / 承認 等を追加）
      // =====================================================

      // このハンドラの対象ではない
      return false;
    } catch (err) {
      logger.error("[KeihiBotHandlers] Interaction処理エラー:", err);

      const reply = {
        content: "⚠️ 処理中にエラーが発生しました。",
        flags: [MessageFlags.Ephemeral],
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }

      return true; // エラーはここで処理した
    }
  },
};