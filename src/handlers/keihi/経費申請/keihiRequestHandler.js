// src/handlers/keihi/経費申請/keihiRequestHandler.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const dayjs = require("dayjs");
const {
  loadKeihiConfig,
  saveKeihiDaily,
} = require("../../../utils/keihi/keihiConfigManager");
const { getGuildConfig } = require("../../../utils/config/gcsConfigManager");

/* ============================================================
 *  Utility - 安全な store / item エンコード系
 * ============================================================ */
function encode(v) {
  return encodeURIComponent(v);
}
function decode(v) {
  return decodeURIComponent(v);
}

/* ============================================================
 *  経費申請開始 – 「経費申請」ボタン押下
 *  customId = keihi:request:open:<storeEncoded>
 * ============================================================ */
async function handleKeihiRequest(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild.id;
    const config = await loadKeihiConfig(guildId);

    // storeName は encode されている。decode して使う。
    const encodedStore = interaction.customId.split(":")[3];
    const storeName = decode(encodedStore);

    const items = config.storeItems?.[storeName] || [];
    if (items.length === 0) {
      return interaction.editReply({
        content: `⚠️ 店舗「${storeName}」には経費項目が設定されていません。`,
      });
    }

    const uniqueItems = [...new Set(items)];
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`keihi:request:select:item:${encode(storeName)}`)
      .setPlaceholder("経費項目を選択してください")
      .addOptions(uniqueItems.map((i) => ({ label: i, value: encode(i) })));

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.editReply({
      content: `📦 経費項目を選択してください（店舗：${storeName}）`,
      components: [row],
    });
  } catch (err) {
    console.error("❌ handleKeihiRequest エラー:", err);
    if (!interaction.replied)
      await interaction.editReply({
        content: "⚠️ 経費申請処理中にエラーが発生しました。",
      });
  }
}

/* ============================================================
 *  経費項目選択 – モーダル表示
 *  customId = keihi:request:select:item:<storeEncoded>
 * ============================================================ */
async function handleKeihiRequestSelect(interaction) {
  const encodedStore = interaction.customId.split(":")[4];
  const encodedItem = interaction.values[0];

  const storeName = decode(encodedStore);
  const itemName = decode(encodedItem);

  const modal = new ModalBuilder()
    .setCustomId(
      `keihi:request:modal:${encode(storeName)}:${encode(itemName)}`
    )
    .setTitle(`📋 経費申請 (${storeName})`);

  const date = new TextInputBuilder()
    .setCustomId("date")
    .setLabel("日付（必須）")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("例: 2025/01/01")
    .setRequired(true)
    .setValue(dayjs().format("YYYY/MM/DD"));

  const dept = new TextInputBuilder()
    .setCustomId("department")
    .setLabel("部署")
    .setStyle(TextInputStyle.Short);

  const amount = new TextInputBuilder()
    .setCustomId("amount")
    .setLabel("金額（必須）")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("例: 3000")
    .setRequired(true);

  const note = new TextInputBuilder()
    .setCustomId("note")
    .setLabel("備考")
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(
    new ActionRowBuilder().addComponents(date),
    new ActionRowBuilder().addComponents(dept),
    new ActionRowBuilder().addComponents(amount),
    new ActionRowBuilder().addComponents(note)
  );

  await interaction.showModal(modal);
}

/* ============================================================
 *  経費申請モーダル送信後
 *  customId = keihi:request:modal:<storeEncoded>:<itemEncoded>
 * ============================================================ */
async function handleKeihiRequestModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const guild = interaction.guild;
  const user = interaction.user;

  const parts = interaction.customId.split(":");
  const storeName = decode(parts[3]);
  const itemName = decode(parts[4]);

  const date = interaction.fields.getTextInputValue("date");
  const department = interaction.fields.getTextInputValue("department") || "-";
  const amount = parseInt(
    interaction.fields.getTextInputValue("amount").replace(/\D/g, ""),
    10
  );
  const note = interaction.fields.getTextInputValue("note") || "-";
  const now = dayjs().format("YYYY/MM/DD HH:mm");

  if (!dayjs(date, "YYYY/MM/DD", true).isValid()) {
    return interaction.editReply({
      content: "⚠️ 日付の形式が正しくありません。「YYYY/MM/DD」で入力してください。",
    });
  }

  const channel = interaction.channel;

  /* ----------------------------------------------------------
   *  スレッド名： YYYYMM-storeName-経費申請
   *  storeName は安全に encode 済み
   * ---------------------------------------------------------- */
  const threadName = `${dayjs(date).format("YYYYMM")}-${storeName}-経費申請`;

  let thread =
    channel.threads.cache.find(
      (t) => t.name === threadName && !t.archived
    ) || null;

  if (!thread) {
    const active = await channel.threads.fetchActive();
    thread = active.threads.find((t) => t.name === threadName);
  }
  if (!thread) {
    thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440,
      reason: "経費申請スレッド作成",
    });
  }

  /* ----------------------------------------------------------
   *  経費申請メッセージ
   * ---------------------------------------------------------- */
  const embed = new EmbedBuilder()
    .setColor("#0984e3")
    .setTitle("🧾 経費申請")
    .addFields(
      { name: "📅 日付", value: date, inline: true },
      { name: "🏢 部署", value: department, inline: true },
      { name: "📦 経費項目", value: itemName, inline: true },
      { name: "💴 金額", value: `${amount.toLocaleString()} 円`, inline: true },
      { name: "🗒️ 備考", value: note },
      { name: "👤 入力者", value: `<@${user.id}>`, inline: true },
      { name: "⏰ 入力時間", value: now, inline: true }
    )
    .setFooter({ text: `店舗：${storeName}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("keihi:approve:approve")
      .setLabel("承認")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("keihi:approve:edit")
      .setLabel("修正")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("keihi:approve:delete")
      .setLabel("削除")
      .setStyle(ButtonStyle.Danger)
  );

  const threadMessage = await thread.send({
    embeds: [embed],
    components: [row],
  });

  /* ----------------------------------------------------------
   *  ログメッセージ
   *  ※ 申請パネルのボタンは増殖しないように削除
   * ---------------------------------------------------------- */
  await channel.send({
    content:
      `---------------------------\n` +
      `経費申請しました。\n` +
      `入力者：<@${user.id}>　入力時間：${now}\n` +
      `${threadMessage.url}\n` +
      `<!-- keihi-log:${user.id}:${now} -->\n` +
      `---------------------------`,
  });

  /* ----------------------------------------------------------
   *  管理者ログ
   * ---------------------------------------------------------- */
  const globalConfig = await getGuildConfig(guildId);
  if (globalConfig?.adminLogChannel) {
    const logCh = guild.channels.cache.get(globalConfig.adminLogChannel);
    if (logCh) {
      const logEmbed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle(`📩 ${storeName} で経費申請がされました`)
        .addFields(
          { name: "📅 日付", value: date, inline: true },
          { name: "🏢 部署", value: department, inline: true },
          { name: "📦 経費項目", value: itemName, inline: true },
          { name: "💴 金額", value: `${amount.toLocaleString()} 円`, inline: true },
          { name: "🗒️ 備考", value: note },
          { name: "👤 入力者", value: `<@${user.id}>` },
          { name: "⏰ 入力時間", value: now }
        )
        .setURL(threadMessage.url)
        .setTimestamp(new Date());

      await logCh.send({ embeds: [logEmbed] });
    }
  }

  /* ----------------------------------------------------------
   *  デイリーデータ保存
   * ---------------------------------------------------------- */
  await saveKeihiDaily(guildId, storeName, {
    date,
    department,
    item: itemName,
    amount,
    note,
    applicant: user.id,
    createdAt: now,
    status: "pending",
  });

  await interaction.editReply({
    content: "✅ 経費申請を作成しました。",
  });
}

module.exports = {
  handleKeihiRequest,
  handleKeihiRequestSelect,
  handleKeihiRequestModal,
};
