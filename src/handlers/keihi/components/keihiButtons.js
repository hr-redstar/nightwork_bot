// src/handlers/keihi/components/keihiButtons.js
// ----------------------------------------------------
// 経費機能用のボタン UI コンポーネント
// ----------------------------------------------------

const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

// =====================================================
// 経費申請パネルのボタン
// =====================================================
function buttonRequest(storeName) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_request:${storeName}`)
      .setLabel("経費を申請する")
      .setStyle(ButtonStyle.Primary)
  );
}

// =====================================================
// 承認 / 否認ボタン
// =====================================================
function buttonApproveReject(storeName, timestamp) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_approve:${storeName}:${timestamp}`)
      .setLabel("承認する")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`keihi_deny:${storeName}:${timestamp}`)
      .setLabel("否認する")
      .setStyle(ButtonStyle.Danger)
  );
}

// =====================================================
// 閲覧系ボタン（任意）
// =====================================================
function buttonDailyView(storeName) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_view:${storeName}`)
      .setLabel("日別の経費を見る")
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  buttonRequest,
  buttonApproveReject,
  buttonDailyView,
};
