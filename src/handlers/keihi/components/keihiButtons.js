// src/handlers/keihi/components/keihiButtons.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  /** 経費申請パネルのボタン */
  rowKeihiRequest(store) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_request:${store}`)
        .setLabel("📤 経費申請")
        .setStyle(ButtonStyle.Primary)
    );
  },

  /** 設定パネルのボタン */
  settingButtons() {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("keihi_panel_setup")
          .setLabel("📤 経費パネル設置")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("keihi_role_approval")
          .setLabel("🛡️ 承認役職")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("keihi_role_view")
          .setLabel("👁️ 閲覧役職")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("keihi_role_apply")
          .setLabel("📝 申請役職")
          .setStyle(ButtonStyle.Success)
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("keihi_csv_export")
          .setLabel("📁 経費CSV発行")
          .setStyle(ButtonStyle.Secondary)
      ),
    ];
  },

  /** スレッド内　承認・修正・削除 */
  threadButtons(store, entryId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_approve:${store}:${entryId}`)
        .setLabel("✔ 承認")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`keihi_modify:${store}:${entryId}`)
        .setLabel("✏ 修正")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`keihi_delete:${store}:${entryId}`)
        .setLabel("🗑 削除")
        .setStyle(ButtonStyle.Danger)
    );
  },
};
