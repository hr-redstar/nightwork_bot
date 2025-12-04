// src/handlers/uriage/report/requestFlow.js
// ----------------------------------------------------
// 売上報告関連のリクエストフロー共通処理
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
} = require('discord.js');

const { IDS } = require('../setting/ids');
const { IDS: STATUS_IDS } = require('./statusIds');
const { sendSettingLog } = require('../../../utils/config/configLogger'); // 管理者ログ用
const logger = require('../../../utils/logger');
const {
  appendUriageRecord,
  updateUriageRecord,
} = require('../../../utils/uriage/gcsUriageManager');

// ------------------------------
// 共通ヘルパー
// ------------------------------
function toSafeNumber(input) {
  if (!input) return 0;
  const normalized = String(input).replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatYen(n) {
  const num = toSafeNumber(n);
  return `¥${num.toLocaleString('ja-JP')}`;
}

function formatDateForThread(dateStr) {
  // YYYY-MM-DD -> YYYYMM
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '000000';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

function getNowUnix() {
  return Math.floor(Date.now() / 1000);
}

// 売上報告パネルの Embed タイトルから店舗名を抜く想定：
// 例）"売上報告パネル - 本店" → "本店"
function resolveStoreNameFromPanel(interaction) {
  const embed = interaction.message?.embeds?.[0];
  if (!embed?.title) return '店舗未設定';

  const parts = embed.title.split('-');
  if (parts.length < 2) return embed.title.trim();
  return parts[1].trim();
}

// スレッド内の「売上報告 - 店舗名」から店舗名を抜く
function resolveStoreNameFromEmbed(message) {
  const embed = message.embeds?.[0];
  if (!embed?.title) return '店舗未設定';

  const parts = embed.title.split('-');
  if (parts.length < 2) return embed.title.trim();
  return parts[1].trim();
}

// ------------------------------
// ① 売上報告モーダルを開く
// ------------------------------
async function openUriageReportModal(interaction) {
  try {
    const storeName = resolveStoreNameFromPanel(interaction);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${yyyy}-${mm}-${dd}`;

    const modalCustomId = `${IDS.MODAL.REPORT}:${encodeURIComponent(storeName)}`;

    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle(`売上報告 - ${storeName}`);

    const dateInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.DATE)
      .setLabel('日付（例：2025-12-03）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(defaultDate);

    const totalInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.TOTAL)
      .setLabel('総売り（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const cashInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.CASH)
      .setLabel('現金（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const cardInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.CARD)
      .setLabel('カード（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const urikakeInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.URIKAKE)
      .setLabel('売掛（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const expenseInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.EXPENSE)
      .setLabel('諸経費（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(totalInput),
      new ActionRowBuilder().addComponents(cashInput),
      new ActionRowBuilder().addComponents(cardInput),
      new ActionRowBuilder().addComponents(urikakeInput),
      new ActionRowBuilder().addComponents(expenseInput),
    );

    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[uriage][openUriageReportModal] エラー:', err);
    // モーダル表示失敗時だけ、ユーザーにエラー返し
    if (!interaction.replied && !interaction.deferred) {
      const { MessageFlags } = require('discord.js');
      await interaction.reply({
        content: '売上報告モーダルの表示中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

// ------------------------------
// ② モーダル送信後の処理
// ------------------------------
async function handleUriageReportModalSubmit(interaction) {
  const baseId = interaction.customId.split(':')[0];
  if (baseId !== IDS.MODAL.REPORT) return;

  const { MessageFlags } = require('discord.js');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const [, encodedStoreName] = interaction.customId.split(':');
    const storeName = encodedStoreName ? decodeURIComponent(encodedStoreName) : '店舗未設定';

    const dateStr = interaction.fields.getTextInputValue(IDS.FIELDS.DATE);
    const totalStr = interaction.fields.getTextInputValue(IDS.FIELDS.TOTAL);
    const cashStr = interaction.fields.getTextInputValue(IDS.FIELDS.CASH);
    const cardStr = interaction.fields.getTextInputValue(IDS.FIELDS.CARD);
    const urikakeStr = interaction.fields.getTextInputValue(IDS.FIELDS.URIKAKE);
    const expenseStr = interaction.fields.getTextInputValue(IDS.FIELDS.EXPENSE);

    const total = toSafeNumber(totalStr);
    const cash = toSafeNumber(cashStr);
    const card = toSafeNumber(cardStr);
    const urikake = toSafeNumber(urikakeStr);
    const expense = toSafeNumber(expenseStr);

    // 👉 残金 = 総売り - (カード + 諸経費)
    const zankin = total - (card + expense);

    const nowUnix = getNowUnix();
    const panelChannel = interaction.channel; // 売上報告パネルがあるチャンネル

    // 1) 月別・店舗別のプライベートスレッドを取得 or 作成
    const ym = formatDateForThread(dateStr); // 202512
    const threadName = `${ym}-${storeName}-売上報告`;

    // アクティブスレッドのキャッシュを更新（見つかりやすくするため）
    try {
      await panelChannel.threads.fetchActive();
    } catch (e) {
      logger.warn('[uriage][handleUriageReportModalSubmit] fetchActive 失敗:', e);
    }

    let reportThread =
      panelChannel.threads.cache.find((t) => t.name === threadName) ?? null;

    if (!reportThread) {
      reportThread = await panelChannel.threads.create({
        name: threadName,
        type: ChannelType.PrivateThread,
        autoArchiveDuration: 4320, // 3日 → 必要なら変更
        reason: '売上報告スレッド自動作成',
      });
    }

    // ユーザーをスレッドに招待（権限があれば）
    try {
      await reportThread.members.add(interaction.user.id);
    } catch (e) {
      logger.warn('[uriage][handleUriageReportModalSubmit] スレッドへのメンバー追加に失敗:', e);
    }

    // 2) スレッド内のログメッセージ
    const embed = new EmbedBuilder()
      .setTitle(`売上報告 - ${storeName}`)
      .addFields(
        { name: '日付', value: dateStr || '未入力', inline: true },
        { name: '総売り', value: formatYen(total), inline: true },
        { name: '現金', value: formatYen(cash), inline: true },
        { name: 'カード', value: formatYen(card), inline: true },
        { name: '売掛', value: formatYen(urikake), inline: true },
        { name: '諸経費', value: formatYen(expense), inline: true },
        { name: '残金（総売り - (カード + 諸経費)）', value: formatYen(zankin), inline: false },
        { name: '入力者', value: `${interaction.user}`, inline: true },
        { name: '入力時間', value: `<t:${nowUnix}:f>`, inline: true },
      )
      .setFooter({ text: `スレッド：${threadName}` });

    // ステータス操作ボタン（承認 / 修正 / 削除）
    // ※ customId にメッセージIDを埋め込んで、後で statusActions.js 側で使う想定
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(STATUS_IDS.BUTTON.APPROVE) // 必要なら `+ ':' + プレフィックス` に変更
        .setLabel('承認')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(STATUS_IDS.BUTTON.EDIT)
        .setLabel('修正')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(STATUS_IDS.BUTTON.DELETE)
        .setLabel('削除')
        .setStyle(ButtonStyle.Danger),
    );

    const threadMessage = await reportThread.send({
      content: `スレッド名：${threadName}\n入力者：${interaction.user}\n入力時間：<t:${nowUnix}:f>`,
      embeds: [embed],
      components: [actionRow],
    });

    // 3) 売上報告パネルのテキストチャンネルにログ出力
    const panelLogMsg = await panelChannel.send(
      [
        '----------------------------',
        `日付：${dateStr} の売上報告がされました。`,
        `入力者：${interaction.user}　入力時間：<t:${nowUnix}:f>`,
        `修正者：-　修正時間：-`,
        `承認者：-　承認時間：-`,
        threadMessage.url,
        '----------------------------',
      ].join('\n'),
    );

    // 4) 管理者ログに出力（config.json を参照する configLogger を利用）
    // 『店舗名』で売上報告がされました。
    // 日付：　入力者：メンションユーザー　　入力時間：
    // スレッドメッセージリンク
    try {
      const description = [
        `『${storeName}』で売上報告がされました。`,
        `日付：${dateStr}　入力者：${interaction.user}　入力時間：<t:${nowUnix}:f>`,
        threadMessage.url,
      ].join('\n');

      await sendSettingLog(interaction, {
        title: '売上報告',
        description,
      });
    } catch (e) {
      logger.warn('[uriage][handleUriageReportModalSubmit] 管理者ログ送信に失敗:', e);
    }

    // 5) GCS にも売上データを保存しておく
    try {
      const record = {
        id: threadMessage.id,
        guildId: interaction.guild.id,
        storeName,
        date: dateStr,
        total,
        cash,
        card,
        urikake,
        expense,
        zankin,
        createdById: interaction.user.id,
        createdByTag: interaction.user.tag,
        createdAt: new Date().toISOString(),
        threadId: threadMessage.channelId,
        threadMessageId: threadMessage.id,
        panelChannelId: panelChannel.id,
        panelLogMessageId: panelLogMsg.id,
        status: 'pending', // 承認前なので pending
      };

      await appendUriageRecord(interaction.guild.id, record);
    } catch (e) {
      logger.warn('[uriage][handleUriageReportModalSubmit] appendUriageRecord 失敗:', e);
    }

    // 5) ユーザーへのフィードバック
    await interaction.editReply({
      content: [
        '✅ 売上報告を登録しました。',
        `・店舗：${storeName}`,
        `・日付：${dateStr}`,
        `・総売り：${formatYen(total)} / 現金：${formatYen(cash)} / カード：${formatYen(card)} / 売掛：${formatYen(urikake)} / 諸経費：${formatYen(expense)}`,
        `・残金：${formatYen(zankin)}`,
        '',
        `スレッド：${threadMessage.url}`,
        `ログ：${panelLogMsg.url}`,
      ].join('\n'),
    });
  } catch (err) {
    logger.error('[uriage][handleUriageReportModalSubmit] エラー:', err);
    await interaction.editReply({
      content: '売上報告の処理中にエラーが発生しました。',
    });
  }
}

// ヘルパー：ログメッセージの行を更新
function updateLogContentLine(original, startsWith, newLine) {
  const lines = original.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(startsWith));
  if (idx === -1) return original;
  lines[idx] = newLine;
  return lines.join('\n');
}

/**
 * 「修正」ボタン押下時に、既存値入りのモーダルを開く
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openUriageEditModal(interaction) {
  try {
    const message = interaction.message; // スレッド内の売上報告メッセージ
    const embed = message.embeds?.[0];

    if (!embed) {
      const { MessageFlags } = require('discord.js');
      await interaction.reply({
        content: '売上データを取得できませんでした。（Embedが見つかりません）',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const storeName = resolveStoreNameFromEmbed(message);

    // 既存フィールドから数値文字列を取り出して、"¥" やカンマを除去しておく
    const getNumericTextFromField = (fieldName) => {
      const field = (embed.fields || []).find((f) => f.name === fieldName);
      if (!field) return '';
      const raw = field.value ?? '';
      const n = toSafeNumber(raw);
      return n ? String(n) : '';
    };

    const totalStr = getNumericTextFromField('総売り');
    const cashStr = getNumericTextFromField('現金');
    const cardStr = getNumericTextFromField('カード');
    const urikakeStr = getNumericTextFromField('売掛');
    const expenseStr = getNumericTextFromField('諸経費');

    const modalCustomId = `${IDS.MODAL.EDIT}:${message.id}`;

    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle(`売上修正 - ${storeName}`);

    const totalInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.TOTAL)
      .setLabel('総売り（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(totalStr);

    const cashInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.CASH)
      .setLabel('現金（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(cashStr);

    const cardInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.CARD)
      .setLabel('カード（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(cardStr);

    const urikakeInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.URIKAKE)
      .setLabel('売掛（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(urikakeStr);

    const expenseInput = new TextInputBuilder()
      .setCustomId(IDS.FIELDS.EXPENSE)
      .setLabel('諸経費（数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setValue(expenseStr);

    modal.addComponents(
      new ActionRowBuilder().addComponents(totalInput),
      new ActionRowBuilder().addComponents(cashInput),
      new ActionRowBuilder().addComponents(cardInput),
      new ActionRowBuilder().addComponents(urikakeInput),
      new ActionRowBuilder().addComponents(expenseInput),
    );

    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[uriage][openUriageEditModal] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      const { MessageFlags } = require('discord.js');
      await interaction.reply({
        content: '売上修正モーダルの表示中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

/**
 * 修正モーダル送信後の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleUriageEditModalSubmit(interaction) {
  const [baseId, targetMessageId] = interaction.customId.split(':');
  if (baseId !== IDS.MODAL.EDIT) return;

  const { MessageFlags } = require('discord.js');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const guildId = interaction.guild.id;
    const thread = interaction.channel; // 売上報告スレッド
    const threadMessage = await thread.messages.fetch(targetMessageId);
    const oldEmbed = threadMessage.embeds?.[0];

    if (!oldEmbed) {
      await interaction.editReply('売上データを取得できませんでした。（Embedが見つかりません）');
      return;
    }

    // Embed から日付を取得（元の date は変更しない仕様）
    const dateField = (oldEmbed.fields || []).find((f) => f.name === '日付');
    const dateStr = dateField ? dateField.value.split(/\s+/)[0].trim() : null;
    const storeName = resolveStoreNameFromEmbed(threadMessage);
    const nowUnix = getNowUnix();

    // モーダルから新しい数値を取得
    const total = toSafeNumber(
      interaction.fields.getTextInputValue(IDS.FIELDS.TOTAL),
    );
    const cash = toSafeNumber(
      interaction.fields.getTextInputValue(IDS.FIELDS.CASH),
    );
    const card = toSafeNumber(
      interaction.fields.getTextInputValue(IDS.FIELDS.CARD),
    );
    const urikake = toSafeNumber(
      interaction.fields.getTextInputValue(IDS.FIELDS.URIKAKE),
    );
    const expense = toSafeNumber(
      interaction.fields.getTextInputValue(IDS.FIELDS.EXPENSE),
    );

    const zankin = total - (card + expense);

    // 既存のステータス系フィールドを回収（承認者/承認時間 など）
    const existingFields = oldEmbed.fields || [];
    const approver = existingFields.find((f) => f.name === '承認者');
    const approverTime = existingFields.find((f) => f.name === '承認時間');

    // 新しいフィールドを組み立て
    const newFields = [
      { name: '日付', value: dateStr || '未入力', inline: true },
      { name: '総売り', value: formatYen(total), inline: true },
      { name: '現金', value: formatYen(cash), inline: true },
      { name: 'カード', value: formatYen(card), inline: true },
      { name: '売掛', value: formatYen(urikake), inline: true },
      { name: '諸経費', value: formatYen(expense), inline: true },
      {
        name: '残金（総売り - (カード + 諸経費)）',
        value: formatYen(zankin),
        inline: false,
      },
    ];

    if (approver) newFields.push(approver);
    if (approverTime) newFields.push(approverTime);

    // 今回の修正者情報
    newFields.push(
      {
        name: '修正者',
        value: `${interaction.user}`,
        inline: true,
      },
      {
        name: '修正時間',
        value: `<t:${nowUnix}:f>`,
        inline: true,
      },
    );

    const newEmbed = EmbedBuilder.from(oldEmbed).setFields(newFields);

    // ① スレッド内メッセージを更新
    await threadMessage.edit({
      embeds: [newEmbed],
      components: threadMessage.components,
    });

    // ② パネル側ログメッセージを更新（スレッドメッセージURLで紐付け）
    const parentChannel = thread.parent;
    let logMsg = null;

    if (parentChannel) {
      const url = `https://discord.com/channels/${guildId}/${thread.id}/${threadMessage.id}`;
      const fetched = await parentChannel.messages.fetch({ limit: 50 });
      logMsg = fetched.find((m) => m.content.includes(url)) || null;
    }

    if (logMsg) {
      const newContent = updateLogContentLine(
        logMsg.content,
        '修正者：',
        `修正者：${interaction.user}　修正時間：<t:${nowUnix}:f>`,
      );
      await logMsg.edit(newContent);
    }

    // ③ GCS のレコードも更新
    if (dateStr) {
      await updateUriageRecord(guildId, dateStr, threadMessage.id, {
        total,
        cash,
        card,
        urikake,
        expense,
        zankin,
        status: 'edited',
        editedById: interaction.user.id,
        editedByTag: interaction.user.tag,
        editedAt: new Date().toISOString(),
      });
    }

    // ④ ユーザーへの結果返却
    await interaction.editReply({
      content: [
        '✏️ 売上報告を修正しました。',
        `・店舗：${storeName}`,
        `・日付：${dateStr}`,
        `・総売り：${formatYen(total)} / 現金：${formatYen(cash)} / カード：${formatYen(card)} / 売掛：${formatYen(urikake)} / 諸経費：${formatYen(expense)}`,
        `・残金：${formatYen(zankin)}`,
        '',
        `スレッド：${threadMessage.url}`,
        logMsg ? `パネルログ：${logMsg.url}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (err) {
    logger.error('[uriage][handleUriageEditModalSubmit] エラー:', err);
    await interaction.editReply('売上修正の処理中にエラーが発生しました。');
  }
}

module.exports = {
  openUriageReportModal,
  handleUriageReportModalSubmit,
  openUriageEditModal,
  handleUriageEditModalSubmit,
};
