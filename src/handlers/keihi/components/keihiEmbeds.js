// src/handlers/keihi/components/keihiEmbeds.js
const { EmbedBuilder } = require("discord.js");

/**
 * 📘 経費設定パネル用 Embed
 *
 * - 経費パネル設置一覧（店舗名：チャンネルリンク）
 * - 承認役職
 * - 経費CSV出力
 */
function embedKeihiSettingPanel(guild, panelMap, approvalRoles) {
  // 経費パネル設置一覧
  const panelLines = Object.entries(panelMap || {})
    .map(([store, chId]) => {
      const ch = guild.channels.cache.get(chId);
      const link = ch ? `<#${chId}>` : "`削除済みチャンネル`";
      return `・**${store}**：${link}`;
    })
    .join("\n");

  // 役職表示
  const formatRoles = (roleIds) => {
    if (!roleIds || !roleIds.length) return "未設定";
    return roleIds
      .map((id) =>
        guild.roles.cache.get(id) ? `<@&${id}>` : "`削除済みロール`"
      )
      .join("　");
  };

  return new EmbedBuilder()
    .setTitle("📘 経費設定パネル")
    .setColor(0x3498db)
    .addFields(
      {
        name: "📋 経費パネル設置一覧",
        value: panelLines || "まだ経費申請パネルが設置されていません。",
      },
      {
        name: "🛡️ 承認役職",
        value: `役職：${formatRoles(approvalRoles)}`,
      },
      {
        name: "📁 経費CSV出力",
        value: "年月日　年月　年　四半期",
      }
    );
}

module.exports = {
  embedKeihiSettingPanel,
};
