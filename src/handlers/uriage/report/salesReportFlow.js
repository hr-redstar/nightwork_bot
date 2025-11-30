// src/handlers/uriage/report/salesReportFlow.js
// ----------------------------------------------------
// 売上報告フロー
//   - 売上報告ボタン押下 → モーダル
//   - モーダル送信 → スレッド作成 & メッセージ & メタ保存 & ログ出力
//   - 承認/修正/削除 ボタン
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

const logger = require('../../../utils/logger');
const { saveText, exists, readFile } = require('../../../utils/gcs');
const { loadUriageSetting } = require('../../../utils/uriage/gcsUriageSettingManager');
const { saveReportMeta, loadReportMeta } = require('../../../utils/uriage/gcsUriageReportManager');
const { isApproverMember } = require('../../../utils/uriage/permissionHelper');
const { sendAdminLog, sendSettingLog } = require('../../../utils/config/configLogger');

// -----------------------------
// 1) 売上報告ボタン押下 → モーダル表示
// customId: URIAGE_SALES_REPORT__<店舗名>
// -----------------------------
async function handleSalesReportButton(interaction) {
  const storeName = interaction.customId.replace('URIAGE_SALES_REPORT__', '');

  const modal = new ModalBuilder()
    .setCustomId(`URIAGE_SALES_REPORT_MODAL__${storeName}`)
    .setTitle(`売上報告 (${storeName})`);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（例: 2025-11-29）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const totalInput = new TextInputBuilder()
    .setCustomId('total')
    .setLabel('総売り（金額）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const genkinInput = new TextInputBuilder()
    .setCustomId('genkin')
    .setLabel('現金（金額）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const cardInput = new TextInputBuilder()
    .setCustomId('card')
    .setLabel('カード（金額）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const urikakeInput = new TextInputBuilder()
    .setCustomId('urikake')
    .setLabel('売掛（金額）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const keihiInput = new TextInputBuilder()
    .setCustomId('keihi')
    .setLabel('諸経費（金額）')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(genkinInput),
    new ActionRowBuilder().addComponents(cardInput),
    new ActionRowBuilder().addComponents(urikakeInput),
    new ActionRowBuilder().addComponents(keihiInput),
  );

  await interaction.showModal(modal);
}

// -----------------------------
// 2) モーダル submit → スレッド作成 & メッセージ & メタ保存
// customId: URIAGE_SALES_REPORT_MODAL__<店舗名>
// -----------------------------
async function handleSalesReportModal(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const user = interaction.user;
  const storeName = interaction.customId.replace('URIAGE_SALES_REPORT_MODAL__', '');
  const panelChannel = interaction.channel; // 売上報告パネルのあるテキストチャンネル

  // 入力値取得
  const dateStr = interaction.fields.getTextInputValue('date').trim();
  const total = Number(interaction.fields.getTextInputValue('total').replace(/,/g, '')) || 0;
  const genkin = Number(interaction.fields.getTextInputValue('genkin').replace(/,/g, '')) || 0;
  const card = Number(interaction.fields.getTextInputValue('card').replace(/,/g, '')) || 0;
  const urikake = Number(interaction.fields.getTextInputValue('urikake').replace(/,/g, '')) || 0;
  const keihi = Number(interaction.fields.getTextInputValue('keihi').replace(/,/g, '')) || 0;

  const zankin = total - (card + keihi); // 仕様通り

  // スレッド名: 年月-店舗名-売上報告
  const ym = dateStr.slice(0, 7).replace('/', '-'); // "2025-11"
  const threadName = `${ym}-${storeName}-売上報告`;

  // 既存スレッド再利用 or 新規作成
  let thread = null;
  try {
    const activeThreads = await panelChannel.threads.fetchActive();
    thread = activeThreads.threads.find((t) => t.name === threadName) || null;
  } catch (err) {
    logger.warn('[salesReportFlow] active threads取得失敗:', err);
  }

  if (!thread) {
    thread = await panelChannel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440, // 24h
      type: ChannelType.PrivateThread,
      reason: '売上報告用スレッド自動作成',
    });
  }

  // スレッドにユーザー追加
  try {
    await thread.members.add(user.id);
  } catch (err) {
    logger.warn('[salesReportFlow] スレッドメンバー追加失敗:', err);
  }

  const now = new Date();
  const nowStr = now.toLocaleString('ja-JP');

  // スレッド内の売上報告メッセージ（承認/修正/削除ボタン付き）
  const embed = new EmbedBuilder()
    .setTitle(`売上報告 (${storeName})`)
    .addFields(
      { name: '日付', value: dateStr || '未入力', inline: true },
      { name: '入力者', value: `<@${user.id}>`, inline: true },
      { name: '入力時間', value: nowStr, inline: true },
      { name: '総売り', value: total.toLocaleString(), inline: true },
      { name: '現金', value: genkin.toLocaleString(), inline: true },
      { name: 'カード', value: card.toLocaleString(), inline: true },
      { name: '売掛', value: urikake.toLocaleString(), inline: true },
      { name: '諸経費', value: keihi.toLocaleString(), inline: true },
      { name: '残金 (総売り - (カード + 諸経費))', value: zankin.toLocaleString(), inline: true },
      { name: '承認者', value: '未承認', inline: true },
      { name: '修正', value: 'なし', inline: true },
      { name: '削除', value: '未削除', inline: true },
    )
    .setColor('#e67e22');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('URIAGE_SALES_APPROVE__PLACEHOLDER') // 後で差し替え
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('URIAGE_SALES_EDIT__PLACEHOLDER')
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('URIAGE_SALES_DELETE__PLACEHOLDER')
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger),
  );

  const threadMessage = await thread.send({
    embeds: [embed],
    components: [row],
  });

  // ボタンID を threadId/messageId を含むものに更新
  const newRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`URIAGE_SALES_APPROVE__${thread.id}__${threadMessage.id}`)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`URIAGE_SALES_EDIT__${thread.id}__${threadMessage.id}`)
      .setLabel('修正')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`URIAGE_SALES_DELETE__${thread.id}__${threadMessage.id}`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger),
  );

  await threadMessage.edit({
    components: [newRow],
  });

  // パネルチャンネルにログ出力
  const panelLog = await panelChannel.send(
    [
      '----------------------------',
      `日付：${dateStr} の売上報告がされました。`,
      `入力者：<@${user.id}>　入力時間：${nowStr}`,
      '修正者：未修正　修正時間：-',
      '承認者：未承認　承認時間：-',
      `スレッドメッセージリンク：${threadMessage.url}`,
      '----------------------------',
    ].join('\n'),
  );

  // メタ保存
  await saveReportMeta(guildId, thread.id, threadMessage.id, {
    storeName,
    date: dateStr,
    total,
    genkin,
    card,
    urikake,
    keihi,
    zankin,
    inputUserId: user.id,
    inputAt: now.toISOString(),
    status: 'pending',
    summaryChannelId: panelLog.channel.id,
    summaryMessageId: panelLog.id,
  });

  // ユーザーへのフィードバック
  await interaction.reply({
    content:
      `店舗「${storeName}」の日付 ${dateStr} の売上報告を登録しました。\n` +
      `スレッド：${thread.toString()}`,
    ephemeral: true,
  });

  // 管理者ログ
  try {
    const adminEmbed = new EmbedBuilder()
      .setTitle('売上報告が登録されました')
      .setDescription(
        `『${storeName}』で売上報告がされました。\n` +
          `日付：${dateStr}\n` +
          `入力者：<@${user.id}>　入力時間：${nowStr}\n` +
          `スレッドメッセージリンク：${threadMessage.url}`,
      )
      .setColor('#e67e22');

    await sendAdminLog(guildId, adminEmbed);
  } catch (err) {
    logger.error('[salesReportFlow] 管理者ログ出力エラー:', err);
  }
}

/**
 * 売上報告を CSV に追記
 */
async function appendReportCsv(guildId, meta, approverUser) {
  const safeStoreName = meta.storeName.replace(/[\/\\]/g, '_'); // 念のため
  const dateStr = meta.date; // "2025-11-29"
  const filePath = `GCS/${guildId}/uriage/${safeStoreName}/売上報告_${dateStr}.csv`;

  const header =
    '日付,店舗名,総売り,現金,カード,売掛,諸経費,残金,入力者ID,承認者ID,承認時間\n';

  const approvedAt = new Date().toISOString();

  const row = [
    meta.date,
    `"${meta.storeName}"`,
    meta.total,
    meta.genkin,
    meta.card,
    meta.urikake,
    meta.keihi,
    meta.zankin,
    meta.inputUserId,
    approverUser.id,
    approvedAt,
  ].join(',') + '\n';

  let csvText = row;

  try {
    const fileExists = await exists(filePath);
    if (fileExists) {
      const buf = await readFile(filePath);
      const cur = buf.toString('utf-8');
      // 既にヘッダがある前提で単純追記
      csvText = cur + row;
    } else {
      csvText = header + row;
    }
  } catch (err) {
    // 読み込み失敗 → 新規作成扱い
    csvText = header + row;
  }

  await saveText(filePath, csvText, 'text/csv; charset=utf-8');
  return { filePath, approvedAt };
}

// -----------------------------
// 3) 承認ボタン
// customId: URIAGE_SALES_APPROVE__<threadId>__<messageId>
// -----------------------------
async function handleSalesApproveButton(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;
  const user = interaction.user;

  // 権限チェック
  if (!(await isApproverMember(member))) {
    await interaction.reply({
      content: 'この売上報告を承認する権限がありません。',
      ephemeral: true,
    });
    return;
  }

  const [, threadId, messageId] = interaction.customId.split('__');
  const meta = await loadReportMeta(guildId, threadId, messageId);

  if (meta.status === 'approved') {
    await interaction.reply({
      content: 'この売上報告は既に承認済みです。',
      ephemeral: true,
    });
    return;
  }
  if (meta.status === 'deleted') {
    await interaction.reply({
      content: 'この売上報告は削除されています。',
      ephemeral: true,
    });
    return;
  }

  // CSV 書き込み
  const { filePath, approvedAt } = await appendReportCsv(guildId, meta, user);

  // メタ更新
  const newMeta = await saveReportMeta(guildId, threadId, messageId, {
    ...meta,
    status: 'approved',
    approvedBy: user.id,
    approvedAt,
  });

  // スレッドメッセージ更新（承認者フィールドなど）
  try {
    const thread = await guild.channels.fetch(threadId);
    const msg = await thread.messages.fetch(messageId);

    const embed = EmbedBuilder.from(msg.embeds[0] || {});
    const fields = embed.data.fields || [];
    const newFields = fields.map((f) => {
      if (f.name.startsWith('承認者')) {
        return {
          ...f,
          value: `<@${user.id}>（${new Date(approvedAt).toLocaleString('ja-JP')}）`,
        };
      }
      return f;
    });

    embed.setFields(newFields);

    await msg.edit({ embeds: [embed] });
  } catch (err) {
    logger.error('[salesReportFlow] 承認時embed更新失敗:', err);
  }

  // パネルチャンネル側のログメッセージ更新
  try {
    if (newMeta.summaryChannelId && newMeta.summaryMessageId) {
      const ch = await guild.channels.fetch(newMeta.summaryChannelId);
      const summaryMsg = await ch.messages.fetch(newMeta.summaryMessageId);

      const lines = summaryMsg.content.split('\n').map((line) => {
        if (line.startsWith('承認者：')) {
          return `承認者：<@${user.id}>　承認時間：${new Date(
            approvedAt,
          ).toLocaleString('ja-JP')}`;
        }
        return line;
      });

      await summaryMsg.edit(lines.join('\n'));
    }
  } catch (err) {
    logger.error('[salesReportFlow] 承認時 summary 更新失敗:', err);
  }

  await interaction.reply({
    content:
      '売上報告を承認しました。\n' +
      `CSV: ${filePath}`,
    ephemeral: true,
  });
}

// -----------------------------
// 4) 修正ボタン
// customId: URIAGE_SALES_EDIT__<threadId>__<messageId>
// -----------------------------
async function handleSalesEditButton(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;
  const user = interaction.user;

  const [, threadId, messageId] = interaction.customId.split('__');
  const meta = await loadReportMeta(guildId, threadId, messageId);

  const isOwner = meta.inputUserId === user.id;
  const isApprover = await isApproverMember(member);

  if (!isOwner && !isApprover) {
    await interaction.reply({
      content: 'この売上報告を修正する権限がありません。',
      ephemeral: true,
    });
    return;
  }

  const now = new Date().toISOString();

  const newMeta = await saveReportMeta(guildId, threadId, messageId, {
    ...meta,
    // ここでは「修正された」というフラグ的扱いにしておく
    lastUpdateAt: now,
  });

  // スレッドメッセージの「修正」フィールド更新
  try {
    const thread = await guild.channels.fetch(threadId);
    const msg = await thread.messages.fetch(messageId);

    const embed = EmbedBuilder.from(msg.embeds[0] || {});
    const fields = embed.data.fields || [];
    const nowStr = new Date(now).toLocaleString('ja-JP');

    const newFields = fields.map((f) => {
      if (f.name.startsWith('修正')) {
        return {
          ...f,
          value: `修正者：<@${user.id}>　修正時間：${nowStr}`,
        };
      }
      return f;
    });

    embed.setFields(newFields);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    logger.error('[salesReportFlow] 修正時 embed 更新失敗:', err);
  }

  // パネルチャンネル側のログメッセージ更新
  try {
    if (newMeta.summaryChannelId && newMeta.summaryMessageId) {
      const ch = await guild.channels.fetch(newMeta.summaryChannelId);
      const summaryMsg = await ch.messages.fetch(newMeta.summaryMessageId);

      const nowStr = new Date(now).toLocaleString('ja-JP');

      const lines = summaryMsg.content.split('\n').map((line) => {
        if (line.startsWith('修正者：')) {
          return `修正者：<@${user.id}>　修正時間：${nowStr}`;
        }
        return line;
      });

      await summaryMsg.edit(lines.join('\n'));
    }
  } catch (err) {
    logger.error('[salesReportFlow] 修正時 summary 更新失敗:', err);
  }

  await interaction.reply({
    content: '修正フラグを更新しました。（詳細な金額修正が必要な場合は、別途実装も可能です）',
    ephemeral: true,
  });
}

// -----------------------------
// 5) 削除ボタン
// customId: URIAGE_SALES_DELETE__<threadId>__<messageId>
// -----------------------------
async function handleSalesDeleteButton(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  const member = interaction.member;
  const user = interaction.user;

  const [, threadId, messageId] = interaction.customId.split('__');
  const meta = await loadReportMeta(guildId, threadId, messageId);

  const isOwner = meta.inputUserId === user.id;
  const isApprover = await isApproverMember(member);

  if (!isOwner && !isApprover) {
    await interaction.reply({
      content: 'この売上報告を削除する権限がありません。',
      ephemeral: true,
    });
    return;
  }

  const now = new Date().toISOString();

  const newMeta = await saveReportMeta(guildId, threadId, messageId, {
    ...meta,
    status: 'deleted',
    deletedBy: user.id,
    deletedAt: now,
  });

  // スレッドメッセージの「削除」フィールド更新
  try {
    const thread = await guild.channels.fetch(threadId);
    const msg = await thread.messages.fetch(messageId);

    const embed = EmbedBuilder.from(msg.embeds[0] || {});
    const fields = embed.data.fields || [];
    const nowStr = new Date(now).toLocaleString('ja-JP');

    const newFields = fields.map((f) => {
      if (f.name.startsWith('削除')) {
        return {
          ...f,
          value: `削除者：<@${user.id}>　削除時間：${nowStr}`,
        };
      }
      return f;
    });

    embed.setFields(newFields);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    logger.error('[salesReportFlow] 削除時 embed 更新失敗:', err);
  }

  // パネルチャンネル側のログメッセージ更新
  try {
    if (newMeta.summaryChannelId && newMeta.summaryMessageId) {
      const ch = await guild.channels.fetch(newMeta.summaryChannelId);
      const summaryMsg = await ch.messages.fetch(newMeta.summaryMessageId);

      const nowStr = new Date(now).toLocaleString('ja-JP');

      const lines = summaryMsg.content.split('\n').map((line) => {
        if (line.startsWith('削除日') || line.startsWith('削除者：')) {
          return `削除者：<@${user.id}>　削除時間：${nowStr}`;
        }
        return line;
      });

      await summaryMsg.edit(lines.join('\n'));
    }
  } catch (err) {
    logger.error('[salesReportFlow] 削除時 summary 更新失敗:', err);
  }

  await interaction.reply({
    content: '売上報告を削除済みとしてマークしました。（CSVからの物理削除は行っていません）',
    ephemeral: true,
  });
}

module.exports = {
  handleSalesReportButton,
  handleSalesReportModal,
  handleSalesApproveButton,
  handleSalesEditButton,
  handleSalesDeleteButton,
};