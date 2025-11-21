// src/handlers/keihi/keihiModifyHandler.js
// ----------------------------------------------------
// 経費修正処理
// ----------------------------------------------------

const {
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const dayjs = require("dayjs");
const {
  sendAdminLog,
  sendKeihiLogUpdate,
} = require("../../utils/keihi/embedLogger");

module.exports = {
  /**
   * 修正ボタン → モーダル表示
   */
  async openModifyModal(interaction, store) {
    const oldEmbed = interaction.message.embeds[0];
    if (!oldEmbed) {
      return interaction.reply({
        content: "⚠️ 修正対象のデータが取得できません。",
        ephemeral: true,
      });
    }

    // --- 既存項目を抽出 ---
    const field = (name) =>
      oldEmbed.fields.find((f) => f.name === name)?.value || "";

    const modal = new ModalBuilder()
      .setCustomId(`keihi_modify_modal:${store}`)
      .setTitle(`経費申請 修正 - ${store}`);

    modal.addComponents(
      makeInput("m_date", "日付", field("日付"), true),
      makeInput("m_dept", "部署", field("部署"), false),
      makeInput("m_item", "項目", field("項目"), true),
      makeInput("m_price", "金額", field("金額").replace(" 円", ""), true),
      makeInput("m_note", "備考", field("備考"), false)
    );

    return interaction.showModal(modal);
  },

  /**
   * 修正モーダル送信 → メッセージ更新処理
   */
  async submitModify(interaction, store) {
    const user = interaction.user;
    const now = dayjs().format("YYYY-MM-DD HH:mm");

    // モーダル入力内容
    const date = interaction.fields.getTextInputValue("m_date");
    const dept = interaction.fields.getTextInputValue("m_dept");
    const item = interaction.fields.getTextInputValue("m_item");
    const price = interaction.fields.getTextInputValue("m_price");
    const note = interaction.fields.getTextInputValue("m_note");

    // スレッド内メッセージを上書き
    const embed = new EmbedBuilder()
      .setTitle(`💰【修正】経費申請：${store}`)
      .addFields(
        { name: "日付", value: date, inline: true },
        { name: "部署", value: dept || "ー", inline: true },
        { name: "項目", value: item, inline: true },
        { name: "金額", value: `${price} 円`, inline: true },
        { name: "備考", value: note || "なし", inline: false },
        {
          name: "入力者",
          value: interaction.message.embeds[0].fields.find((f) => f.name === "入力者")?.value || "ー",
          inline: true,
        },
        {
          name: "入力時間",
          value: interaction.message.embeds[0].fields.find((f) => f.name === "入力時間")?.value || "ー",
          inline: true,
        },
        { name: "修正者", value: `<@${user.id}>`, inline: true },
        { name: "修正時間", value: now, inline: true }
      )
      .setColor(0xf1c40f);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`keihi_approve:${store}`)
        .setLabel("承認")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`keihi_modify:${store}`)
        .setLabel("修正")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`keihi_delete:${store}`)
        .setLabel("削除")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.message.edit({ embeds: [embed], components: [row] });

    // ----------------------------------------------------
    // 経費申請ログの更新（修正者を追記）
    // ----------------------------------------------------
    await sendKeihiLogUpdate(interaction.guild.id, {
      type: "modify",
      modifyUser: user.id,
      modifyTime: now,
      threadUrl: interaction.message.url,
    });

    // ----------------------------------------------------
    // 管理者ログへ出力
    // ----------------------------------------------------
    await sendAdminLog(interaction.guild.id, {
      action: "経費修正",
      store,
      date,
      dept,
      item,
      price,
      note,
      modifyUser: user.id,
      modifyTime: now,
      thread: interaction.message.url,
    });

    return interaction.reply({
      content: "🔧 経費申請内容を修正しました。",
      ephemeral: true,
    });
  },
};

// --------------------------------------------------------------
// 共通：モーダル用入力生成
// --------------------------------------------------------------
function makeInput(id, label, value, required) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setValue(value || "")
      .setRequired(required)
      .setStyle(TextInputStyle.Short)
  );
}
