// src/handlers/keihi/keihiDeleteHandler.js
// ----------------------------------------------------
// 経費削除処理
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const dayjs = require("dayjs");
const {
  loadKeihiConfig,
  sendAdminLog,
  sendKeihiLogUpdate,
} = require("../../../utils/keihi/embedLogger");

module.exports = {
  /**
   * 削除処理
   */
  async deleteKeihi(interaction, store) {
    const user = interaction.user;
    const member = interaction.member;
    const now = dayjs().format("YYYY-MM-DD HH:mm");

    // 元のメッセージ（申請内容）
    const message = interaction.message;
    const oldEmbed = message.embeds[0];

    if (!oldEmbed) {
      return interaction.reply({
        content: "⚠️ 削除対象のデータが取得できません。",
        ephemeral: true,
      });
    }

    // ----------------------------
    // ① 申請者 or 承認者のみ許可
    // ----------------------------
    const inputUser = oldEmbed.fields.find((f) => f.name === "入力者")?.value;
    const approveUser = oldEmbed.fields.find((f) => f.name === "承認者")?.value;
    const config = await loadKeihiConfig(interaction.guild.id);
    const approvalRoles = config.approvalRoles || [];

    const userId = `<@${user.id}>`;

    const canDelete =
      inputUser?.includes(userId) ||
      approveUser?.includes(userId) ||
      member.roles.cache.some((r) => approvalRoles.includes(r.id));

    if (!canDelete) {
      return interaction.reply({
        content: "⚠️ この経費申請を削除する権限がありません。",
        ephemeral: true,
      });
    }

    // ----------------------------
    // ② embed 更新（削除済バージョン）
    //----------------------------
    const date = oldEmbed.fields.find((f) => f.name === "日付")?.value || "";
    const dept = oldEmbed.fields.find((f) => f.name === "部署")?.value || "";
    const item = oldEmbed.fields.find((f) => f.name === "項目")?.value || "";
    const price = oldEmbed.fields.find((f) => f.name === "金額")?.value || "";
    const note = oldEmbed.fields.find((f) => f.name === "備考")?.value || "";
    const inputTime = oldEmbed.fields.find((f) => f.name === "入力時間")?.value || "";

    const newEmbed = new EmbedBuilder()
      .setTitle(`💰【削除済】経費申請：${store}`)
      .setColor(0xe74c3c)
      .addFields(
        { name: "日付", value: date, inline: true },
        { name: "部署", value: dept, inline: true },
        { name: "項目", value: item, inline: true },
        { name: "金額", value: price, inline: true },
        { name: "備考", value: note, inline: false },
        { name: "入力者", value: inputUser, inline: true },
        { name: "入力時間", value: inputTime, inline: true },
        { name: "削除者", value: `<@${user.id}>`, inline: true },
        { name: "削除時間", value: now, inline: true }
      );

    // 削除後はボタンを消す
    await message.edit({
      embeds: [newEmbed],
      components: [],
    });

    // ----------------------------
    // ③ 経費申請ログの更新（削除ログ追記）
    // ----------------------------
    await sendKeihiLogUpdate(interaction.guild.id, {
      type: "delete",
      deleteUser: user.id,
      deleteTime: now,
      threadUrl: message.url,
    });

    // ----------------------------
    // ④ 管理者ログ出力
    // ----------------------------
    await sendAdminLog(interaction.guild.id, {
      action: "経費削除",
      store,
      date,
      dept,
      item,
      price,
      note,
      deleteUser: user.id,
      deleteTime: now,
      thread: message.url,
    });

    return interaction.reply({
      content: "🗑️ 経費申請を削除しました。",
      ephemeral: true,
    });
  },
};
