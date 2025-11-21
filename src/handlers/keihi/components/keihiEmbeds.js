// src/handlers/keihi/components/keihiEmbeds.js
// ----------------------------------------------------
// 経費機能用の Embed UI コンポーネント
// ----------------------------------------------------

const { EmbedBuilder } = require("discord.js");

// =====================================================
// 経費申請パネル（店舗側）
// =====================================================
function embedRequestPanel(storeName) {
  return new EmbedBuilder()
    .setTitle(`💰 経費申請パネル - ${storeName}`)
    .setDescription("ここから経費申請を行えます。\n必要事項を入力し申請してください。")
    .setColor(0x2ecc71);
}

// =====================================================
// 経費申請完了メッセージ
// =====================================================
function embedRequestComplete(entry) {
  const embed = new EmbedBuilder()
    .setTitle("💰 経費申請を受け付けました")
    .setColor(0x2ecc71)
    .addFields(
      { name: "店舗", value: entry.store, inline: true },
      { name: "金額", value: `${entry.amount} 円`, inline: true },
      { name: "内容", value: entry.description }
    )
    .setTimestamp();

  if (entry.imageUrl) {
    embed.setImage(entry.imageUrl);
  }

  return embed;
}

// =====================================================
// 経費承認・否認後の表示
// =====================================================
function embedApprovalResult(entry, isApprove) {
  return new EmbedBuilder()
    .setTitle(`💰 経費申請 - ${entry.store}`)
    .setColor(isApprove ? 0x2ecc71 : 0xe74c3c)
    .addFields(
      { name: "申請者", value: `<@${entry.userId}>` },
      { name: "金額", value: `${entry.amount} 円`, inline: true },
      { name: "内容", value: entry.description },
      {
        name: "承認状態",
        value: isApprove ? "🟢 **承認されました**" : "🔴 **否認されました**",
      }
    )
    .setTimestamp();
}

// =====================================================
// 経費一覧 (日付別)
// =====================================================
function embedDailyList(storeName, date, list) {
  const embed = new EmbedBuilder()
    .setTitle(`📅 経費一覧 - ${storeName} (${date})`)
    .setColor(0x3498db)
    .setTimestamp();

  for (const entry of list) {
    embed.addFields({
      name: `💰 ${entry.amount} 円`,
      value:
        `申請者: <@${entry.userId}>\n` +
        `内容: ${entry.description}\n` +
        `状態: ${entry.approved ? "🟢 承認済" : "🔴 未承認"}\n`,
    });
  }

  return embed;
}

module.exports = {
  embedRequestPanel,
  embedRequestComplete,
  embedApprovalResult,
  embedDailyList,
};
