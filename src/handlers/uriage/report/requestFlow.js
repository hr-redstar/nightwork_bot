// src/handlers/uriage/report/requestFlow.js
// ----------------------------------------------------
// 売上「1日の締め」売上報告フロー（5項目モーダル対応版）
//   - 売上報告ボタン → モーダル表示
//   - モーダル送信 → プライベートスレッド作成
//                    （スレッド: 年月-店舗名-売上報告）
//                  → スレッドに詳細ログ + 承認/修正/削除ボタン
//                  → 売上報告パネルのテキストチャンネルにログ出力
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const { URIAGE_REPORT_IDS } = require('./ids');
const {
  appendUriageDailyRecord,
} = require('../../../utils/uriage/gcsUriageManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');

// 数値文字列 → number (カンマ除去)
function parseNumber(str) {
  if (!str) return NaN;
  const cleaned = str.replace(/,/g, '').trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

// 「売掛・諸経費」1入力から2つの数値に分解
// 例: "20000 5000" → { urikake: 20000, expense: 5000 }
//     "20000"      → { urikake: 20000, expense: 0 }
function parseUrikakeExpense(str) {
  if (!str) {
    return { urikake: 0, expense: 0 };
  }

  // カンマや全角スペースもざっくり区切りとして扱う
  const raw = str
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return { urikake: 0, expense: 0 };
  }

  const parts = raw.split(' ');
  const urikake = parseNumber(parts[0]);
  const expense = parts[1] != null ? parseNumber(parts[1]) : 0;

  return { urikake, expense };
}

// レコードID生成（customId と GCS で共通利用）
function createRecordId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// 店舗名解決（storeKey → storeName）
async function resolveStoreName(guildId, storeKey) {
  const storeConfig = await loadStoreRoleConfig(guildId);
  const stores = storeConfig?.stores || [];
  const hit = stores.find((s) => s.id === storeKey || s.name === storeKey);
  return hit?.name || storeKey;
}

/**
 * 売上「1日の締め」モーダルを表示（5項目）
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} storeKey
 */
async function openUriageRequestModal(interaction, storeKey) {
  const modalCustomId = `${URIAGE_REPORT_IDS.MODAL_REQUEST_PREFIX}:${storeKey}`;

  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle('本日の売上報告（締め）');

  // 1. 日付（任意 / 空欄で今日）
  const dateInput = new TextInputBuilder()
    .setCustomId('uriage-date')
    .setLabel('日付 (例: 2025-11-25 / 空欄で今日)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  // 2. 総売り
  const totalInput = new TextInputBuilder()
    .setCustomId('uriage-total')
    .setLabel('総売り（金額・数字のみ）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  // 3. 現金
  const cashInput = new TextInputBuilder()
    .setCustomId('uriage-cash')
    .setLabel('現金（金額・数字のみ）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  // 4. カード
  const cardInput = new TextInputBuilder()
    .setCustomId('uriage-card')
    .setLabel('カード（金額・数字のみ）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  // 5. 売掛・諸経費（1入力で2値）
  const urikakeExpenseInput = new TextInputBuilder()
    .setCustomId('uriage-urikake-expense')
    .setLabel('売掛・諸経費（例: "20000 5000" ※諸経費なしなら "20000 0"）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(cashInput),
    new ActionRowBuilder().addComponents(cardInput),
    new ActionRowBuilder().addComponents(urikakeExpenseInput),
  );

  return interaction.showModal(modal);
}

/**
 * 売上「1日の締め」モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {string} storeKey
 */
async function handleUriageRequestModalSubmit(interaction, storeKey) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const user = interaction.user;
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: '売上報告はギルドのテキストチャンネルからのみ行えます。',
      ephemeral: true,
    });
  }

  let dateStr = interaction.fields.getTextInputValue('uriage-date')?.trim();
  const totalStr = interaction.fields.getTextInputValue('uriage-total')?.trim();
  const cashStr = interaction.fields.getTextInputValue('uriage-cash')?.trim();
  const cardStr = interaction.fields.getTextInputValue('uriage-card')?.trim();
  const urikakeExpenseStr = interaction.fields
    .getTextInputValue('uriage-urikake-expense')
    ?.trim();

  // 日付：未入力なら今日
  const now = new Date();
  if (!dateStr) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }

  // 数値変換
  const total = parseNumber(totalStr);
  const cash = parseNumber(cashStr);
  const card = parseNumber(cardStr);
  const { urikake, expense } = parseUrikakeExpense(urikakeExpenseStr);

  // バリデーション（ざっくり）
  if (!Number.isFinite(total) || total < 0) {
    return interaction.reply({
      content: '「総売り」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(cash) || cash < 0) {
    return interaction.reply({
      content: '「現金」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(card) || card < 0) {
    return interaction.reply({
      content: '「カード」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(urikake) || urikake < 0) {
    return interaction.reply({
      content: '「売掛」は0以上の数字で入力してください。（売掛 諸経費 の順で入力）',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(expense) || expense < 0) {
    return interaction.reply({
      content: '「諸経費」は0以上の数字で入力してください。（売掛 諸経費 の順で入力）',
      ephemeral: true,
    });
  }

  const dateKey = dateStr; // 'YYYY-MM-DD'
  const [yearStr, monthStr] = dateStr.split('-');
  const ymStr = `${yearStr}${monthStr}`; // スレッド名用 "年月"
  const recordId = createRecordId();
  const storeName = await resolveStoreName(guildId, storeKey);

  // 残金 = 総売り - (カード + 諸経費)
  const zankin = total - (card + expense);

  // -----------------------------
  // ① プライベートスレッド作成
  // -----------------------------
  const threadName = `${ymStr}-${storeName}-売上報告`.slice(0, 90);

  const thread = await channel.threads.create({
    name: threadName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    type: ChannelType.PrivateThread,
    reason: `売上報告: ${storeName} (${dateStr})`,
  });

  // 入力者をスレッドに追加（権限不足等で失敗したら無視）
  try {
    await thread.members.add(user.id);
  } catch {
    // ignore
  }

  const nowTs = Math.floor(Date.now() / 1000);

  // スレッド内ログ Embed
  const threadEmbed = new EmbedBuilder()
    .setTitle('💰 売上報告（1日の締め）')
    .setDescription(`店舗: **${storeName}**\n日付: **${dateStr}**`)
    .addFields(
      { name: '総売り', value: `${total.toLocaleString()} 円`, inline: true },
      { name: '現金', value: `${cash.toLocaleString()} 円`, inline: true },
      { name: 'カード', value: `${card.toLocaleString()} 円`, inline: true },
      { name: '売掛', value: `${urikake.toLocaleString()} 円`, inline: true },
      { name: '諸経費', value: `${expense.toLocaleString()} 円`, inline: true },
      { name: '残金', value: `${zankin.toLocaleString()} 円`, inline: true },
      { name: '入力者', value: `<@${user.id}>`, inline: true },
      { name: '入力時間', value: `<t:${nowTs}:f>`, inline: true },
      { name: 'ステータス', value: '承認待ち', inline: true },
    )
    .setTimestamp(new Date());

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${URIAGE_REPORT_IDS.BTN_APPROVE_PREFIX}:${recordId}`)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${URIAGE_REPORT_IDS.BTN_EDIT_PREFIX}:${recordId}`)
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${URIAGE_REPORT_IDS.BTN_DELETE_PREFIX}:${recordId}`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger),
  );

  const threadMessage = await thread.send({
    content: `<@${user.id}> さんの売上報告です。`,
    embeds: [threadEmbed],
    components: [buttonRow],
  });

  // -----------------------------
  // ② 親チャンネルにログ出力
  // -----------------------------
  const logEmbed = new EmbedBuilder()
    .setTitle('💰 売上報告 受付')
    .setDescription(`店舗: **${storeName}**\n日付: **${dateStr}**`)
    .addFields(
      { name: '総売り', value: `${total.toLocaleString()} 円`, inline: true },
      { name: '現金', value: `${cash.toLocaleString()} 円`, inline: true },
      { name: 'カード', value: `${card.toLocaleString()} 円`, inline: true },
      { name: '売掛', value: `${urikake.toLocaleString()} 円`, inline: true },
      { name: '諸経費', value: `${expense.toLocaleString()} 円`, inline: true },
      { name: '残金', value: `${zankin.toLocaleString()} 円`, inline: true },
      { name: 'スレッド', value: `<#${thread.id}>`, inline: false },
    )
    .setTimestamp(new Date());

  const logMessage = await channel.send({ embeds: [logEmbed] });

  // -----------------------------
  // ③ GCS に保存
  // -----------------------------
  const record = {
    id: recordId,
    type: 'closing', // 1日の締め
    createdAt: new Date().toISOString(),
    createdBy: user.id,

    storeKey,
    storeName,
    date: dateStr,

    total,
    cash,
    card,
    urikake,
    expense,
    zankin,

    source: 'manual',
    status: 'pending', // 承認待ち

    threadId: thread.id,
    threadMessageId: threadMessage.id,
    logMessageId: logMessage.id,
    channelId: channel.id,
  };

  await appendUriageDailyRecord(guildId, storeKey, dateKey, record);

  // -----------------------------
  // ④ ユーザーへのエフェメラル返信
  // -----------------------------
  return interaction.reply({
    content: '売上報告（1日の締め）を受け付けました。スレッドで承認・修正・削除が行えます。',
    ephemeral: true,
  });
}

module.exports = {
  openUriageReportModal,
  handleUriageRequestModalSubmit,
};