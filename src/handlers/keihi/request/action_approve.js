// src/handlers/keihi/request/action_approve.js
// ----------------------------------------------------
// 経費申請「承認」ボタンの処理
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
  buildStatusButtons,
} = require('./statusHelpers');
const { STATUS_IDS } = require('./statusIds');

// ★ 年月日ファイル用
const {
  loadKeihiDailyData,
  saveKeihiDailyData,
  loadKeihiMonthlyData,
  saveKeihiMonthlyData,
  loadKeihiYearlyData,
  saveKeihiYearlyData,
} = require('../../../utils/keihi/gcsKeihiManager');

// 日付文字列 → { yyyy, mm, dd }
function parseYmdParts(dateStr) {
  if (!dateStr) return null;
  const m = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/.exec(dateStr.trim());
  if (!m) return null;
  const yyyy = m[1];
  const mm = String(Number(m[2]) || 0).padStart(2, '0');
  const dd = String(Number(m[3]) || 0).padStart(2, '0');
  return { yyyy, mm, dd };
}

/**
 * 承認ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleApproveButton(interaction) {
  const { customId, guild, member } = interaction;

  if (!guild) {
    await interaction.reply({
      content: 'ギルド情報が取得できませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const guildId = guild.id;

  // customId:
  //   keihi_request_approve::{storeId}::{threadId}::{messageId}::{status?}
  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;

  if (prefix !== STATUS_IDS.APPROVE || !storeId || !threadId || !messageId) {
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
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const approverRoleIds = collectApproverRoleIds(keihiConfig);

  if (!approverRoleIds.length) {
    await interaction.editReply({
      content:
        '承認役職が設定されていないため、承認できません。\n先に `/設定経費` から承認役職を設定してください。',
    });
    return;
  }

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
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

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const approvedAtText = `<t:${tsUnix}:f>`;

  // Embed fields 更新
  const fields = Array.isArray(baseEmbed.fields)
    ? baseEmbed.fields.map((f) => ({ ...f }))
    : [];

  const upsertField = (name, value, inline = true) => {
    const found = fields.find((f) => f.name === name);
    if (found) {
      found.value = value;
      found.inline = inline;
    } else {
      fields.push({ name, value, inline });
    }
  };

  upsertField('ステータス', '✅ 承認済み', true);
  upsertField('承認者', `${member}`, true);
  upsertField('承認時間', approvedAtText, true);

  const newEmbed = EmbedBuilder.from(baseEmbed)
    .setTitle('経費申請 ✅ 承認されました')
    .setFields(fields)
    .setTimestamp(now);

  const newButtonsRow = buildStatusButtons(
    storeId,
    threadId,
    messageId,
    'APPROVED',
  );

  await message.edit({ embeds: [newEmbed], components: [newButtonsRow] });

  // パネルチャンネル側のログメッセージも更新
  const parentChannel = thread.isThread() && thread.parent ? thread.parent : thread;
  const logMessageId = baseEmbed.footer?.text?.startsWith('LogID: ')
    ? baseEmbed.footer.text.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages
      .fetch(logMessageId)
      .catch(() => null);
    if (logMessage) {
      let content = logMessage.content;

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

      await logMessage.edit({ content });
    }
  }

  // 日・月・年 集計ファイル更新
  try {
    await updateKeihiStatsOnApprove({
      guildId,
      storeId,
      baseEmbed,
      threadMessage: message,
      approver: member,
    });
  } catch (e) {
    console.error('[keihi] 年月日ファイル更新中にエラー:', e);
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');
  const originalInputUser = getEmbedFieldValue(baseEmbed, '入力者');
  const originalInputTime = getEmbedFieldValue(baseEmbed, '入力時間');

  await sendSettingLog(interaction, {
    title: '経費申請承認',
    description:
      `✅ 店舗「${storeName}」の経費申請を承認しました。\n` +
      `承認者：${member}\n承認時間：${approvedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `入力者：${originalInputUser}　入力時間：${originalInputTime}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を承認しました。' });
}

/**
 * 承認時に 日・月・年 の集計ファイルを更新
 */
async function updateKeihiStatsOnApprove({
  guildId,
  storeId,
  baseEmbed,
  threadMessage,
  approver,
}) {
  const dateStrRaw = getEmbedFieldValue(baseEmbed, '日付') || '';
  const dateStr = dateStrRaw.trim();
  if (!dateStr) return;

  const department = (getEmbedFieldValue(baseEmbed, '部署') || '').trim();
  const itemName = (getEmbedFieldValue(baseEmbed, '経費項目') || '').trim();
  const amountField = getEmbedFieldValue(baseEmbed, '金額') || '';
  const note = (getEmbedFieldValue(baseEmbed, '備考') || '').trim();
  const inputUser = (getEmbedFieldValue(baseEmbed, '入力者') || '').trim();

  const inputUserId = inputUser.match(/<@!?(\d+)>/)?.[1] || null;

  const cleanedAmountText = String(amountField)
    .replace(/[^\d,，]/g, '')
    .replace(/[,，]/g, '')
    .trim();
  const amount = Number(cleanedAmountText || '0');
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const logId =
    baseEmbed.footer?.text?.startsWith('LogID: ')
      ? baseEmbed.footer.text.slice('LogID: '.length)
      : null;

  // 日別
  const dailyData = (await loadKeihiDailyData(guildId, storeId, dateStr)) || {};
  if (!Array.isArray(dailyData.requests)) dailyData.requests = [];

  let record = dailyData.requests.find((r) => r.id === threadMessage.id);
  const prevApprovedAmount =
    record && record.status === 'APPROVED' ? Number(record.amount || 0) : 0;

  if (!record) {
    record = {};
    dailyData.requests.push(record);
  }

  Object.assign(record, {
    id: threadMessage.id,
    logId: logId || null,
    status: 'APPROVED',
    date: dateStr,
    department,
    item: itemName,
    amount,
    note,
    requesterId: inputUserId,
    requester: inputUser,
    approvedById: approver.id,
    approvedBy: `${approver}`,
    approvedAt: nowIso,
    updatedAt: nowIso,
  });

  dailyData.guildId = guildId;
  dailyData.storeId = storeId;
  dailyData.date = dateStr;
  dailyData.totalApprovedAmount = dailyData.requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  dailyData.lastUpdated = nowIso;

  await saveKeihiDailyData(guildId, storeId, dateStr, dailyData);

  const diff = amount - prevApprovedAmount;
  if (!diff) return;

  const ymd = parseYmdParts(dateStr);
  if (!ymd) return;
  const { yyyy, mm } = ymd;
  const monthKey = `${yyyy}-${mm}`;

  // 月別
  const monthlyData =
    (await loadKeihiMonthlyData(guildId, storeId, dateStr)) || {};
  monthlyData.guildId = guildId;
  monthlyData.storeId = storeId;
  monthlyData.month = monthKey;
  monthlyData.byDay = monthlyData.byDay || {};

  monthlyData.byDay[dateStr] =
    (Number(monthlyData.byDay[dateStr]) || 0) + diff;

  monthlyData.totalApprovedAmount = Object.values(monthlyData.byDay).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );
  monthlyData.lastUpdated = nowIso;

  await saveKeihiMonthlyData(guildId, storeId, dateStr, monthlyData);

  // 年別
  const yearlyData =
    (await loadKeihiYearlyData(guildId, storeId, dateStr)) || {};
  yearlyData.guildId = guildId;
  yearlyData.storeId = storeId;
  yearlyData.year = yyyy;
  yearlyData.byMonth = yearlyData.byMonth || {};

  yearlyData.byMonth[monthKey] =
    (Number(yearlyData.byMonth[monthKey]) || 0) + diff;

  yearlyData.totalApprovedAmount = Object.values(yearlyData.byMonth).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );
  yearlyData.lastUpdated = nowIso;

  await saveKeihiYearlyData(guildId, storeId, dateStr, yearlyData);
}

module.exports = { handleApproveButton };
