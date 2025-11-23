// src/handlers/keihi/components/keihiButtons.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  /** 経費申請パネルのボタン（2列目用） */
  rowKeihiRequest(store) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_request:${store}`)
        .setLabel("📤 経費申請")
        .setStyle(ButtonStyle.Primary)
    );
  },

  /**
   * 📘 経費設定パネルのボタン
   *
   * 1行目：経費パネル設置 / 承認役職
   * 2行目：経費CSV発行
   */
  settingButtons() {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("keihi_panel_setup")
        .setLabel("📤 経費パネル設置")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("keihi_role_approval")
        .setLabel("🛡️ 承認役職")
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("keihi_csv_export")
        .setLabel("📁 経費CSV発行")
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  },

  /** スレッド内　承認・修正・削除ボタン */
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
