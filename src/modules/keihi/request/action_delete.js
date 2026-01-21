// src/handlers/keihi/request/action_delete.js
// ----------------------------------------------------
// 経費申請「削除」ボタンの処理
//   - 取り消し線は「経費項目・金額・備考」のみ
//   - 管理者ログ②（削除）は、管理者ログ①（申請）に返信（AdminLogID が取れた時）
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
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
const logger = require('../../../utils/logger');
const { generateKeihiCsvFiles } = require('../../../utils/keihi/keihiCsvGenerator');
const { resolveStoreName } = require('../setting/storeNameResolver');
const {
  loadKeihiDailyData,
  saveKeihiDailyData,
  loadKeihiMonthlyData,
  saveKeihiMonthlyData,
  loadKeihiYearlyData,
  saveKeihiYearlyData,
} = require('../../../utils/keihi/gcsKeihiManager');

// ----------------------------------------------------
// 色：申請/修正=青、承認=緑、削除=赤
// ----------------------------------------------------
const COLORS = {
  BLUE: 0x5865f2,
  GREEN: 0x57f287,
  RED: 0xed4245,
};

// ----------------------------------------------------
// ユーティリティ
// ----------------------------------------------------
// ✅ 取り消し線は「経費項目 / 金額 / 備考」だけに使う
function strikeOnlyForDelete(v) {
  const s = stripTilde(v);
  if (!s || s === '未入力' || s === '不明') return '~~未入力~~';
  if (s.startsWith('~~') && s.endsWith('~~')) return s;
  return `~~${s}~~`;
}

// ----------------------------------------------------
// Embed（削除）
// ----------------------------------------------------
function buildDeletedEmbed({
  baseEmbed,
  deleterMention,
  deletedAt,
  deletedAtText,
  logId,
}) {
  const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '未入力';
  const department = stripTilde(getEmbedFieldValue(baseEmbed, '部署')) || '未入力';

  // ✅ ここだけ取り消し線
  const itemName = getEmbedFieldValue(baseEmbed, '経費項目');
  const amountStr = getEmbedFieldValue(baseEmbed, '金額');
  const note = getEmbedFieldValue(baseEmbed, '備考');

  const requesterMention = stripTilde(getEmbedFieldValue(baseEmbed, '入力者')) || '未入力';
  const inputTimeText = stripTilde(getEmbedFieldValue(baseEmbed, '入力時間')) || '未入力';

  const modifierMention = stripTilde(getEmbedFieldValue(baseEmbed, '修正者')) || '未入力';
  const modifyTimeText = stripTilde(getEmbedFieldValue(baseEmbed, '修正時間')) || '未入力';

  const approverMention = stripTilde(getEmbedFieldValue(baseEmbed, '承認者')) || '未入力';
  const approveTimeText = stripTilde(getEmbedFieldValue(baseEmbed, '承認時間')) || '未入力';

  return new EmbedBuilder()
    .setTitle('❌ 経費申請　削除しました')
    .setColor(COLORS.RED)
    .addFields(
      // 1列目
      { name: 'ステータス', value: '❌ 削除済み', inline: true },
      { name: '日付', value: dateStr, inline: true },
      { name: '部署', value: department, inline: true },

      // 2列目（✅ この3つだけ取り消し線）
      { name: '経費項目', value: strikeOnlyForDelete(itemName), inline: true },
      { name: '金額', value: strikeOnlyForDelete(amountStr), inline: true },
      { name: '備考', value: strikeOnlyForDelete(note), inline: true },

      // 3列目
      { name: '入力者', value: requesterMention, inline: true },
      { name: '入力時間', value: inputTimeText, inline: true },
      blankField(),

      // 4列目
      { name: '修正者', value: modifierMention, inline: true },
      { name: '修正時間', value: modifyTimeText, inline: true },
      blankField(),

      // 5列目
      { name: '承認者', value: approverMention, inline: true },
      { name: '承認時間', value: approveTimeText, inline: true },
      blankField(),

      // 削除情報（取り消し線なし）
      { name: '削除者', value: deleterMention || '未入力', inline: true },
      { name: '削除時間', value: deletedAtText || '未入力', inline: true },
      blankField(),
    )
    .setTimestamp(deletedAt)
    .setFooter({ text: `LogID: ${logId || '-'}` });
}

// ----------------------------------------------------
// メイン
// ----------------------------------------------------
async function handleDeleteButton(interaction) {
  try {
    const { guild, member, customId } = interaction;
    if (!guild) return;

    const guildId = guild.id;

    // keihi_request_delete::{storeId}::{threadId}::{messageId}
    const parts = customId.split('::');
    const [, storeId, threadId, messageId] = parts;

    if (!storeId || !threadId || !messageId) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'ボタンIDの形式が不正です。', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const thread = await guild.channels.fetch(threadId).catch(() => null);
    if (!thread || !thread.isThread()) {
      await interaction.editReply({ content: '対象のスレッドが見つかりませんでした。' });
      return;
    }

    const message = await thread.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.editReply({ content: '対象のメッセージが見つかりませんでした。' });
      return;
    }

    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guild.id),
      loadStoreRoleConfig(guild.id).catch(() => null),
    ]);

    const approverRoleIds = collectApproverRoleIds(keihiConfig);
    if (!approverRoleIds.length) {
      await interaction.editReply({ content: '承認役職が設定されていないため、削除できません。' });
      return;
    }

    const baseEmbed = message.embeds?.[0];
    if (!baseEmbed) {
      await interaction.editReply({ content: '対象の経費申請メッセージが見つかりませんでした。' });
      return;
    }

    const { hasPermission, message: permError } = checkStatusActionPermission(
      'delete',
      member,
      baseEmbed,
      approverRoleIds,
    );
    if (!hasPermission) {
      await interaction.editReply({ content: permError });
      return;
    }

    // 既に削除済みなら処理しない
    const status = getEmbedFieldValue(baseEmbed, 'ステータス');
    if (String(status || '').includes('削除済み')) {
      await interaction.editReply({ content: 'この申請は既に削除済みです。' });
      return;
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);
    const now = new Date();
    const tsUnix = Math.floor(now.getTime() / 1000);
    const deletedAtText = `<t:${tsUnix}:f>`;

    const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

    // 1) Embed更新（削除=赤）
    const newEmbed = buildDeletedEmbed({
      baseEmbed,
      deleterMention: `${member}`,
      deletedAt: now,
      deletedAtText,
      logId: keihiLogId,
    });

    const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'DELETED');
    await message.edit({ embeds: [newEmbed], components: [newButtonsRow] });

    // 2) keihiLog 更新（削除者/削除時間）
    const parentChannel = thread.parent ?? null;
    let adminLogId = null;

    if (parentChannel && keihiLogId) {
      const keihiLogMsg = await parentChannel.messages.fetch(keihiLogId).catch(() => null);
      if (keihiLogMsg) {
        let content = keihiLogMsg.content || '';

        adminLogId = parseAdminLogIdFromKeihiLogContent(content);

        if (/^削除者：/m.test(content)) {
          content = content.replace(
            /^削除者：.*$/m,
            `削除者：${member}　削除時間：${deletedAtText}`,
          );
        } else {
          content = content.replace(
            /------------------------------\s*$/m,
            `削除者：${member}　削除時間：${deletedAtText}\n------------------------------`,
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
        .setColor(COLORS.RED) // ✅ 削除: 赤
        .addFields(
          { name: '削除者', value: `${member}`, inline: true },
          { name: '削除時間', value: deletedAtText, inline: true },
          blankField(),
          { name: 'スレッドメッセージリンク', value: message.url, inline: false },
        )
        .setTimestamp(now);

      const sent = await sendAdminLog(interaction, {
        action: 'DELETE',
        content: `経費　✖️削除\n店舗「${storeName}」\n${dateStr} の申請が削除されました。`,
        embeds: [adminEmbed],
        replyToMessageId: adminLogId || null,
      });
      if (!sent) logger.warn('[keihi/delete] admin log was not sent (sendAdminLog returned null)');
    } catch (e) {
      logger.warn('[keihi/delete] sendAdminLog failed', e);
    }

    // 4) JSON/CSV 更新
    await updateKeihiStatsOnDelete({
      guild,
      guildId: guild.id,
      storeName,
      baseEmbed,
      threadMessage: message,
      deleter: member,
      deletedAtIso: now.toISOString(),
    });

    await interaction.editReply({ content: '経費申請を削除しました。' });
  } catch (err) {
    logger.error('[keihi] handleDeleteButton で予期しないエラー', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '削除処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => {});
    } else {
      await interaction.editReply({ content: '削除処理中にエラーが発生しました。' }).catch(() => {});
    }
  }
}

// ----------------------------------------------------
// JSON/CSV 更新（削除）
// ----------------------------------------------------
async function updateKeihiStatsOnDelete({
  guild,
  guildId,
  storeName,
  baseEmbed,
  threadMessage,
  deleter,
  deletedAtIso,
}) {
  const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付'));
  if (!dateStr) return;

  const dailyData = (await loadKeihiDailyData(guildId, storeName, dateStr).catch(() => null)) || null;
  if (!dailyData || !Array.isArray(dailyData.requests)) return;

  const record = dailyData.requests.find((r) => String(r.id) === String(threadMessage.id));
  if (!record) return;

  const prevStatus = record.status;
  const prevAmount = Number(record.amount || 0);

  record.status = 'DELETED';
  record.statusJa = '削除';
  record.deletedById = deleter.id;
  record.deletedBy = deleter.displayName || deleter.user?.username || `${deleter}`;
  record.deletedAt = deletedAtIso;
  record.lastUpdated = deletedAtIso;

  // ✅ 日別合計を再計算（承認済みのみ）
  dailyData.totalApprovedAmount = dailyData.requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  dailyData.lastUpdated = deletedAtIso;
  await saveKeihiDailyData(guildId, storeName, dateStr, dailyData).catch(() => {});

  // 承認済みじゃなければ月年は触らない（CSVだけ再生成）
  if (prevStatus !== 'APPROVED' || !prevAmount) {
    await generateKeihiCsvFiles(guild, storeName, dailyData, null, null).catch(() => {});
    return;
  }
  const diff = -prevAmount;

  const ymd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!ymd) {
    await generateKeihiCsvFiles(guild, storeName, dailyData, null, null);
    return;
  }
  const [, yyyy, mm] = ymd;
  const monthKey = `${yyyy}-${mm}`;

  // 月別
  let monthlyData = await loadKeihiMonthlyData(guildId, storeName, monthKey).catch(() => null);
  if (monthlyData) {
    monthlyData.byDay = monthlyData.byDay || {};
    const nextDayVal = (Number(monthlyData.byDay[dateStr]) || 0) + diff;

    if (nextDayVal <= 0) delete monthlyData.byDay[dateStr];
    else monthlyData.byDay[dateStr] = nextDayVal;

    monthlyData.totalApprovedAmount = Object.values(monthlyData.byDay).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0,
    );
    monthlyData.lastUpdated = new Date().toISOString();
    await saveKeihiMonthlyData(guildId, storeName, monthKey, monthlyData).catch(() => {});
  }

  // 年別
  let yearlyData = await loadKeihiYearlyData(guildId, storeName, yyyy).catch(() => null);
  if (yearlyData) {
    yearlyData.byMonth = yearlyData.byMonth || {};
    const nextMonthVal = (Number(yearlyData.byMonth[monthKey]) || 0) + diff;

    if (nextMonthVal <= 0) delete yearlyData.byMonth[monthKey];
    else yearlyData.byMonth[monthKey] = nextMonthVal;

    yearlyData.totalApprovedAmount = Object.values(yearlyData.byMonth).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0,
    );
    yearlyData.lastUpdated = new Date().toISOString();
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

module.exports = { handleDeleteButton };