// src/handlers/keihi/components/keihiEmbeds.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  /**
   * 📘 経費設定パネル
   */
  embedSettingPanel(guild, panelMap, approvalRoles) {
    const formatRoles = (roleIds) => {
      if (!roleIds || !roleIds.length) return "未設定";
      return roleIds
        .map((id) => guild.roles.cache.get(id)
          ? `<@&${id}>`
          : "`削除済みロール`")
        .join("　");
    };

    const panelLines = Object.entries(panelMap || {})
      .map(([store, chId]) => {
        const ch = guild.channels.cache.get(chId);
        return `・**${store}**：${ch ? `<#${chId}>` : "`削除済みチャンネル`"}`;
      })
      .join("\n");

    return new EmbedBuilder()
      .setTitle("📘 経費設定パネル")
      .setColor(0x3498db)
      .setDescription("経費パネル設置・承認役職・CSV出力の管理を行います。")
      .addFields(
        {
          name: "📋 経費パネル設置一覧",
          value: panelLines || "まだ経費申請パネルが設置されていません。",
        },
        {
          name: "🛡️ 承認役職",
          value: `役職：${formatRoles(approvalRoles)}`
        },
        {
          name: "📁 経費CSV出力",
          value: "CSVを発行するには「経費CSV発行」ボタンを押してください。",
        }
      );
  }
};
