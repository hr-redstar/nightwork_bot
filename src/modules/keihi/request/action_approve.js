// src/handlers/keihi/request/action_approve.js
// ----------------------------------------------------
// 経費申請「承認」ボタンの処理
//  - スレッド内メッセージ Embed 更新（承認=緑）
//  - keihiLog（申請チャンネルログ）更新（承認者/承認時間）
//  - 管理者ログ（②：①に返信）を送信（承認=緑）
//  - JSON（日別/月別/年別）更新 + CSV再生成
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');

const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');

const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
  buildStatusButtons,
  blankField,
  stripTilde,
  parseKeihiLogIdFromFooter,
  parseAdminLogIdFromKeihiLogContent,
} = require('./statusHelpers');

const { resolveStoreName } = require('../setting/storeNameResolver');
const {
  loadKeihiDailyData,
  saveKeihiDailyData,
  loadKeihiMonthlyData,
  saveKeihiMonthlyData,
  loadKeihiYearlyData,
  saveKeihiYearlyData,
} = require('../../../utils/keihi/gcsKeihiManager');

const { generateKeihiCsvFiles } = require('../../../utils/keihi/keihiCsvGenerator');

// ----------------------------------------------------
// 色：申請/修正=青、承認=緑、削除=赤
// ----------------------------------------------------
const COLORS = {
  BLUE: 0x5865f2,
  GREEN: 0x57f287,
  RED: 0xed4245,
};

function buildApprovedEmbed({
  baseEmbed,
  approverMention,
  approvedAt,
  approvedAtText,
  logId,
}) {
  const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付'));
  const department = stripTilde(getEmbedFieldValue(baseEmbed, '部署'));
  const itemName = stripTilde(getEmbedFieldValue(baseEmbed, '経費項目'));
  const amountStr = stripTilde(getEmbedFieldValue(baseEmbed, '金額'));
  const note = stripTilde(getEmbedFieldValue(baseEmbed, '備考'));

  const requesterMention = stripTilde(getEmbedFieldValue(baseEmbed, '入力者'));
  const inputTimeText = stripTilde(getEmbedFieldValue(baseEmbed, '入力時間'));

  const modifierMention = stripTilde(getEmbedFieldValue(baseEmbed, '修正者'));
  const modifyTimeText = stripTilde(getEmbedFieldValue(baseEmbed, '修正時間'));

  return new EmbedBuilder()
    .setTitle('✅ 経費申請　承認しました')
    .setColor(COLORS.GREEN) // ✅ 承認: 緑
    .addFields(
      // 1列目
      { name: 'ステータス', value: '✅ 承認済み', inline: true },
      { name: '日付', value: dateStr || '未入力', inline: true },
      { name: '部署', value: department || '未入力', inline: true },

      // 2列目
      { name: '経費項目', value: itemName || '未入力', inline: true },
      { name: '金額', value: amountStr || '未入力', inline: true },
      { name: '備考', value: note || '未入力', inline: true },

      // 3列目
      { name: '入力者', value: requesterMention || '未入力', inline: true },
      { name: '入力時間', value: inputTimeText || '未入力', inline: true },
      blankField(),

      // 4列目
      { name: '修正者', value: modifierMention || '未入力', inline: true },
      { name: '修正時間', value: modifyTimeText || '未入力', inline: true },
      blankField(),

      // 5列目
      { name: '承認者', value: approverMention || '未入力', inline: true },
      { name: '承認時間', value: approvedAtText || '未入力', inline: true },
      blankField(),
    )
    .setTimestamp(approvedAt)
    .setFooter({ text: `LogID: ${logId || '-'}` }); // null 対策もついでに
}

// ----------------------------------------------------
// 承認ボタン押下
// ----------------------------------------------------
/**
 * 承認ボタン押下
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApproveButton(interaction) {
  try {
    const { guild, member, customId } = interaction;
    if (!guild) return;

    const guildId = guild.id;

    // keihi_request_approve::{storeId}::{threadId}::{messageId}
    const parts = customId.split('::');
    const [, storeId, threadId, messageId] = parts;

    if (!storeId || !threadId || !messageId) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'ボタンIDの形式が不正です。',
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = await guild.channels.fetch(threadId).catch(() => null);
    if (!thread || !thread.isThread()) {
      await interaction.editReply({ content: '対象のスレッドが見つかりませんでした。' });
      return;
    }

    const threadMessage = await thread.messages.fetch(messageId).catch(() => null);
    if (!threadMessage) {
      await interaction.editReply({ content: '対象のメッセージが見つかりませんでした。' });
      return;
    }

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guild.id),
      loadStoreRoleConfig(guild.id).catch(() => null),
    ]);

    const approverRoleIds = collectApproverRoleIds(keihiConfig);
    if (!approverRoleIds.length) {
      await interaction.editReply({ content: '承認役職が設定されていないため、承認できません。' });
      return;
    }

    const baseEmbed = threadMessage.embeds?.[0];
    if (!baseEmbed) {
      await interaction.editReply({ content: '対象の経費申請メッセージが見つかりませんでした。' });
      return;
    }

    const { hasPermission, message: permError } = checkStatusActionPermission(
      'approve',
      member,
      baseEmbed,
      approverRoleIds,
    );
    if (!hasPermission) {
      await interaction.editReply({ content: permError });
      return;
    }

    const status = getEmbedFieldValue(baseEmbed, 'ステータス');
    if (status?.includes('承認済み')) {
      await interaction.editReply({ content: 'この申請は既に承認済みです。' });
      return;
    }
    if (status?.includes('削除済み')) {
      await interaction.editReply({ content: 'この申請は削除済みのため承認できません。' });
      return;
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);

    const now = new Date();
    const tsUnix = Math.floor(now.getTime() / 1000);
    const approvedAtText = `<t:${tsUnix}:f>`;

    // keihiLogID（= footer の LogID）
    const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

    // 1) Embed更新（承認=緑）
    const newEmbed = buildApprovedEmbed({
      baseEmbed,
      approverMention: `${member}`,
      approvedAt: now,
      approvedAtText,
      logId: keihiLogId,
    });

    const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'APPROVED');
    await threadMessage.edit({ embeds: [newEmbed], components: [newButtonsRow] });

    // 2) keihiLog 更新（承認者/承認時間）
    const parentChannel = thread.parent ?? null;
    let adminLogId = null;

    if (parentChannel && keihiLogId) {
      const keihiLogMsg = await parentChannel.messages.fetch(keihiLogId).catch(() => null);
      if (keihiLogMsg) {
        let content = keihiLogMsg.content || '';

        // 返信先 AdminLogID を拾う
        adminLogId = parseAdminLogIdFromKeihiLogContent(content);

        // 承認者行（置換 or 追加）
        if (/^承認者：/m.test(content)) {
          content = content.replace(
            /^承認者：.*$/m,
            `承認者：${member}　承認時間：${approvedAtText}`,
          );
        } else {
          content = content.replace(
            /------------------------------\s*$/m,
            `承認者：${member}　承認時間：${approvedAtText}\n------------------------------`,
          );
        }

        await keihiLogMsg.edit({ content }).catch(() => null);
      }
    }

    // 3) 管理者ログ（②：①に返信）
    try {
      const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '未入力';

      const adminEmbed = new EmbedBuilder()
        .setTitle(`日付：${dateStr}`)
        .setColor(COLORS.GREEN) // ✅ 承認: 緑
        .addFields(
          { name: '承認者', value: `${member}`, inline: true },
          { name: '承認時間', value: approvedAtText, inline: true },
          blankField(),
          { name: 'スレッドメッセージリンク', value: threadMessage.url, inline: false },
        )
        .setTimestamp(now);

      await sendAdminLog(interaction, {
        action: 'APPROVE',
        content: `経費　✅チェックマーク承認\n店舗「${storeName}」\n${dateStr} の申請が承認されました。`,
        embeds: [adminEmbed],
        replyToMessageId: adminLogId || null,
      });
    } catch (e) {
      logger.warn('[keihi/approve] sendAdminLog failed', e);
    }

    // 4) JSON更新 + CSV再生成
    await updateKeihiStatsOnApprove({
      guild,
      guildId: guild.id,
      storeName,
      baseEmbed,
      threadMessage,
      approver: member,
      approvedAtIso: now.toISOString(),
    });

    await interaction.editReply({ content: '経費申請を承認しました。' });
  } catch (err) {
    logger.error('[keihi] handleApproveButton で予期しないエラー', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: '承認処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral })
        .catch(() => {});
    } else {
      await interaction.editReply({ content: '承認処理中にエラーが発生しました。' }).catch(() => {});
    }
  }
}

// ----------------------------------------------------
// JSON/CSV 更新（承認）
// ----------------------------------------------------
async function updateKeihiStatsOnApprove({
  guild,
  guildId,
  storeName,
  baseEmbed,
  threadMessage,
  approver,
  approvedAtIso,
}) {
  const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付'));
  if (!dateStr) return;

  const dailyData = (await loadKeihiDailyData(guildId, storeName, dateStr).catch(() => null)) || null;
  if (!dailyData || !Array.isArray(dailyData.requests)) return;

  const record = dailyData.requests.find((r) => String(r.id) === String(threadMessage.id));
  if (!record) return;

  const prevStatus = record.status;
  const amount = Number(record.amount || 0);

  record.status = 'APPROVED';
  record.statusJa = '承認';
  record.approvedById = approver.id;
  record.approvedBy = approver.displayName || approver.user?.username || `${approver}`;
  record.approvedAt = approvedAtIso;
  record.lastUpdated = approvedAtIso;

  // 日別合計（承認済みのみ）
  dailyData.totalApprovedAmount = dailyData.requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  dailyData.lastUpdated = approvedAtIso;
  await saveKeihiDailyData(guildId, storeName, dateStr, dailyData).catch(() => {});

  // 以前すでに承認済みなら月年の加算不要
  if (prevStatus === 'APPROVED' || !amount) {
    await generateKeihiCsvFiles(guild, storeName, dailyData, null, null).catch(() => {});
    return;
  }

  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!ymd) {
    await generateKeihiCsvFiles(guild, storeName, dailyData, null, null).catch(() => {});
    return;
  }
  const [, yyyy, mm] = ymd;
  const monthKey = `${yyyy}-${mm}`;

  // 月別
  const monthlyData =
    (await loadKeihiMonthlyData(guildId, storeName, monthKey).catch(() => null)) || null;

  if (monthlyData) {
    monthlyData.byDay = monthlyData.byDay || {};
    monthlyData.byDay[dateStr] = (Number(monthlyData.byDay[dateStr]) || 0) + amount;

    monthlyData.totalApprovedAmount = Object.values(monthlyData.byDay)
      .reduce((sum, v) => sum + (Number(v) || 0), 0);

    monthlyData.lastUpdated = approvedAtIso;
    await saveKeihiMonthlyData(guildId, storeName, monthKey, monthlyData).catch(() => {});
  }

  // 年別
  const yearlyData =
    (await loadKeihiYearlyData(guildId, storeName, yyyy).catch(() => null)) || null;

  if (yearlyData) {
    yearlyData.byMonth = yearlyData.byMonth || {};
    yearlyData.byMonth[monthKey] = (Number(yearlyData.byMonth[monthKey]) || 0) + amount;

    yearlyData.totalApprovedAmount = Object.values(yearlyData.byMonth)
      .reduce((sum, v) => sum + (Number(v) || 0), 0);

    yearlyData.lastUpdated = approvedAtIso;
    await saveKeihiYearlyData(guildId, storeName, yyyy, yearlyData).catch(() => {});
  }

  await generateKeihiCsvFiles(
    guild,
    storeName,
    dailyData,
    monthlyData || null,
    yearlyData || null,
  ).catch(() => {});
}

module.exports = { handleApproveButton };
