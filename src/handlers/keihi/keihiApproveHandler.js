// src/handlers/keihi/keihiApproveHandler.js
// ----------------------------------------------------
// 経費承認処理
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
} = require("../../utils/keihi/keihiConfigManager");

const {
  sendAdminLog,
  sendKeihiLogUpdate,
} = require("../../utils/keihi/embedLogger");

module.exports = {
  /**
   * 経費承認処理
   */
  async approveKeihi(interaction, store) {
    const guildId = interaction.guild.id;
    const user = interaction.user;
    const member = interaction.member;

    const config = await loadKeihiConfig(guildId);
    const approvalRoles = config.approvalRoles || [];

    // ------------------------------------------------
    // ① 権限チェック（承認役職のみ）
    // ------------------------------------------------
    const hasPermission = member.roles.cache.some((r) =>
      approvalRoles.includes(r.id)
    );

    if (!hasPermission) {
      return interaction.reply({
        content: "⚠️ あなたには承認権限がありません。",
        ephemeral: true,
      });
    }

    // ------------------------------------------------
    // ② 承認時間
    // ------------------------------------------------
    const approveTime = dayjs().format("YYYY-MM-DD HH:mm");

    //------------------------------
    // ③ 対象メッセージ取得
    //------------------------------
    const message = interaction.message;
    const oldEmbed = message.embeds[0];

    if (!oldEmbed) {
      return interaction.reply({
        content: "⚠️ 承認対象のメッセージがありません。",
        ephemeral: true,
      });
    }

    const field = (name) =>
      oldEmbed.fields.find((f) => f.name === name)?.value || "";

    const date = field("日付");
    const dept = field("部署");
    const item = field("項目");
    const price = field("金額");
    const note = field("備考");
    const inputUser = field("入力者");
    const inputTime = field("入力時間");

    //------------------------------
    // ④ 承認済み embed に更新
    //------------------------------
    const newEmbed = new EmbedBuilder()
      .setTitle(`💰【承認済】経費申請：${store}`)
      .setColor(0x2ecc71)
      .addFields(
        { name: "日付", value: date, inline: true },
        { name: "部署", value: dept, inline: true },
        { name: "項目", value: item, inline: true },
        { name: "金額", value: price, inline: true },
        { name: "備考", value: note, inline: false },
        { name: "入力者", value: inputUser, inline: true },
        { name: "入力時間", value: inputTime, inline: true },
        { name: "承認者", value: `<@${user.id}>`, inline: true },
        { name: "承認時間", value: approveTime, inline: true }
      );

    // 修正・削除ボタンは残し、承認ボタンは削除
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_modify:${store}`)
        .setLabel("修正")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`keihi_delete:${store}`)
        .setLabel("削除")
        .setStyle(ButtonStyle.Danger)
    );

    await message.edit({ embeds: [newEmbed], components: [row] });

    //------------------------------
    // ⑤ 経費申請ログ更新（承認者追加）
    //------------------------------
    await sendKeihiLogUpdate(guildId, {
      type: "approve",
      approveUser: user.id,
      approveTime,
      threadUrl: message.url,
    });

    //------------------------------
    // ⑥ 管理者ログ
    //------------------------------
    await sendAdminLog(guildId, {
      action: "経費承認",
      store,
      date,
      dept,
      item,
      price,
      note,
      approveUser: user.id,
      approveTime,
      inputUser,
      inputTime,
      thread: message.url,
    });

    return interaction.reply({
      content: "✅ 経費申請を承認しました。",
      ephemeral: true,
    });
  },
};
