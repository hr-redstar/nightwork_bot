// src/handlers/keihi/keihiRequestHandler.js
// ----------------------------------------------------
// 経費申請フロー（項目選択 → モーダル → スレッド → ログ）
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const dayjs = require("dayjs");

const {
  loadKeihiConfig,
} = require("../../../utils/keihi/keihiConfigManager");

const {
  getKeihiPanelList,
} = require("../../../utils/keihi/keihiConfigManager");

const {
  sendAdminLog,
  sendSettingLog,
  sendKeihiLog,
} = require("../../../utils/keihi/embedLogger");

module.exports = {
  // ============================================================
  // ① 経費申請ボタン → 経費項目のリストを表示
  // ============================================================
  async startKeihiRequest(interaction, store) {
    const guildId = interaction.guild.id;
    const config = await loadKeihiConfig(guildId);
    const items = config.items?.[store] || [];

    if (!items.length) {
      return interaction.reply({
        content: "⚠️ この店舗には経費項目が設定されていません。",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`keihi_request_item:${store}`)
      .setPlaceholder("経費項目を選択してください")
      .addOptions(
        items.map((item) => ({
          label: item,
          value: item,
        }))
      );

    const embed = new EmbedBuilder()
      .setTitle(`💰 経費申請 - ${store}`)
      .setDescription("申請する経費項目を選択してください。")
      .setColor(0x2ecc71);

    return interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },

  // ============================================================
  // ② 経費項目 → モーダル入力
  // ============================================================
  async openKeihiModal(interaction, store, item) {
    const today = dayjs().format("YYYY-MM-DD");

    const modal = new ModalBuilder()
      .setCustomId(`keihi_request_modal:${store}:${item}`)
      .setTitle(`経費申請 - ${store}`);

    modal.addComponents(
      makeInput("keihi_date", "日付（必須）", today, true),
      makeInput("keihi_dept", "部署", "", false),
      makeInput("keihi_item", "経費項目（自動入力）", item, true),
      makeInput("keihi_price", "金額（必須）", "", true),
      makeInput("keihi_note", "備考", "", false)
    );

    return interaction.showModal(modal);
  },

  // ============================================================
  // ③ モーダル送信 → スレッド作成
  // ============================================================
  async submitKeihiRequest(interaction, store, item) {
    const guildId = interaction.guild.id;

    const date = interaction.fields.getTextInputValue("keihi_date");
    const dept = interaction.fields.getTextInputValue("keihi_dept");
    const price = interaction.fields.getTextInputValue("keihi_price");
    const note = interaction.fields.getTextInputValue("keihi_note");
    const user = interaction.user;
    const now = dayjs().format("YYYY-MM-DD HH:mm");

    const threadName = `${dayjs(date).format("YYYYMM")}-${store}-経費申請`;

    // 既存スレッドチェック
    const existing = interaction.channel.threads.cache.find(
      (t) => t.name === threadName
    );

    const thread = existing
      ? existing
      : await interaction.channel.threads.create({
          name: threadName,
          autoArchiveDuration: 1440,
        });

    // スレッドへ投稿 embed
    const embed = new EmbedBuilder()
      .setTitle(`💰 経費申請：${store}`)
      .addFields(
        { name: "日付", value: date, inline: true },
        { name: "部署", value: dept || "ー", inline: true },
        { name: "項目", value: item, inline: true },
        { name: "金額", value: `${price} 円`, inline: true },
        { name: "備考", value: note || "なし", inline: false },
        { name: "入力者", value: `<@${user.id}>`, inline: true },
        { name: "入力時間", value: now, inline: true }
      )
      .setColor(0x3498db);

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

    const msg = await thread.send({
      embeds: [embed],
      components: [row],
    });

    // ============================================================
    // ログ出力（管理者ログ）
    // ============================================================
    await sendAdminLog(guildId, {
      action: "経費申請",
      store,
      date,
      dept,
      item,
      price,
      note,
      user: user.id,
      time: now,
      thread: msg.url,
    });

    // ============================================================
    // 経費申請ログチャンネルへの投稿
    // ============================================================
    await sendKeihiLog(guildId, {
      store,
      date,
      item,
      price,
      user: user.id,
      time: now,
      url: msg.url,
    });

    // ============================================================
    // 経費申請パネルを最新化
    // ============================================================
    await refreshPanel(interaction, store);

    return interaction.reply({
      content: "✅ 経費申請を受け付けました。",
      ephemeral: true,
    });
  },
};

// ⏬---------------------------------------------
// 共通：テキスト入力生成
// ----------------------------------------------
function makeInput(id, label, value, required) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setRequired(required)
      .setValue(value || "")
  );
}

// ⏬---------------------------------------------
// 経費申請パネルを再送信（最新化）
// ----------------------------------------------
async function refreshPanel(interaction, store) {
  const guildId = interaction.guild.id;
  const panelList = await getKeihiPanelList(guildId);
  const channelId = panelList[store];

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 5 });
  const oldPanel = messages.find((m) =>
    m.embeds[0]?.title?.includes("経費申請パネル")
  );

  if (oldPanel) await oldPanel.delete();

  const embed = new EmbedBuilder()
    .setTitle(`💰 経費申請パネル - ${store}`)
    .setDescription("経費申請はこちらから行えます。")
    .setColor(0x2ecc71);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_request:${store}`)
      .setLabel("経費申請")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}
