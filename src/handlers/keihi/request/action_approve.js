// src/handlers/keihi/request/action_approve.js
// ----------------------------------------------------
// 経費申請「承認」ボタンの処理
// ----------------------------------------------------

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');
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

// ----------------------------------------------------
// 日付文字列 → { yyyy, mm, dd } の簡易パーサ
//   - "YYYY-MM-DD"
//   - "YYYY/MM/DD"
// の両方に対応
// ----------------------------------------------------
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

  // customId 形式:
  //   keihi_request_approve::{storeId}::{threadId}::{messageId}
  // または buildStatusButtons 経由で:
  //   keihi_request_approve::{storeId}::{threadId}::{messageId}::{status}
  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;
  // const status = parts[4] || null; // 必要になったら利用

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

  // 権限チェック（承認者ロールを持つメンバーのみ承認可能）
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

  // 既存フィールドをコピーしてからステータス系を上書き
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

  // ステータスボタンを再構築（status = 'APPROVED' を付与）
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
        // 既存行を上書き
        content = content.replace(
          /^承認者：.*$/m,
          `承認者：${member}　承認時間：${approvedAtText}`,
        );
      } else {
        // 一番下の罫線の直前に追記
        content = content.replace(
          /------------------------------\s*$/m,
          `承認者：${member}　承認時間：${approvedAtText}\n------------------------------`,
        );
      }

      await logMessage.edit({ content });
    }
  }

  // ---------- ここで 年月日ファイルを更新 ----------
  try {
    await updateKeihiStatsOnApprove({
      guildId,
      storeId,
      baseEmbed,
      threadMessage: message,
      approver: member,
    });
  } catch (e) {
    // 統計更新に失敗しても本体処理は続行
    console.error('[keihi] 年月日ファイル更新中にエラー:', e);
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');
  const originalInputUser = getEmbedFieldValue(baseEmbed, '入力者');
  const originalInputTime = getEmbedFieldValue(baseEmbed, '入力時間');

  await sendAdminLog(interaction, {
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
 * @param {{
 *   guildId: string,
 *   storeId: string,
 *   baseEmbed: import('discord.js').Embed,
 *   threadMessage: import('discord.js').Message,
 *   approver: import('discord.js').GuildMember
 * }} params
 */
async function updateKeihiStatsOnApprove({
  guildId,
  storeId,
  baseEmbed,
  threadMessage,
  approver,
}) {
  // ギルド名（サーバー名）
  const guildName = threadMessage.guild?.name || null;

  // Embed から各項目を取得
  const dateStrRaw = getEmbedFieldValue(baseEmbed, '日付') || '';
  const dateStr = dateStrRaw.trim();
  if (!dateStr) return; // 日付ないとどうにもならないのでスキップ

  const department = (getEmbedFieldValue(baseEmbed, '部署') || '').trim();
  const itemName = (getEmbedFieldValue(baseEmbed, '経費項目') || '').trim();
  const amountField = getEmbedFieldValue(baseEmbed, '金額') || '';
  const note = (getEmbedFieldValue(baseEmbed, '備考') || '').trim();
  const inputUser = (getEmbedFieldValue(baseEmbed, '入力者') || '').trim();

  const inputUserId = inputUser.match(/<@!?(\d+)>/)?.[1] || null;

  // ---- ★ 名前を解決（申請者 / 承認者）ここから ----
  const guild = threadMessage.guild;

  // メンションからユーザーID抽出
  // リクエストしたユーザーの表示名 / ユーザー名を取得
  let requesterName = null;
  if (inputUserId && guild) {
    let requesterMember = guild.members.cache.get(inputUserId);
    if (!requesterMember) {
      requesterMember = await guild.members.fetch(inputUserId).catch(() => null);
    }
    // デフォルトは埋め込みに入っている文字列そのまま
    requesterName = inputUser;
    // メンバー情報が取れたら表示名/ユーザー名優先
    if (member) {
      requesterName =
        requesterMember.displayName ||
        requesterMember.nickname ||
        requesterMember.user?.globalName ||
        requesterMember.user?.username ||
        inputUser;
    }
  }
  // 承認者の表示名 / ユーザー名
  const approvedByName =
    approver.displayName || approver.nickname || approver.user?.globalName ||
    approver.user?.username || `${approver}`;
  // ---- ★ ここまで ----

  // "10,000 円" → "10000" にする
  const cleanedAmountText = String(amountField)
    .replace(/[^\d,，]/g, '')
    .replace(/[,，]/g, '')
    .trim();
  const amount = Number(cleanedAmountText || '0');
  if (!Number.isFinite(amount) || amount <= 0) {
    return; // 金額が取れない場合は集計スキップ
  }

  const nowIso = new Date().toISOString();
  const logId =
    baseEmbed.footer?.text?.startsWith('LogID: ')
      ? baseEmbed.footer.text.slice('LogID: '.length)
      : null;

  // ---------------- 日別ファイル ----------------
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
    requester: inputUser, // メンション形式も残しておく
    requesterName, // ★ 申請者の表示名（新規追加）
    approvedById: approver.id,
    approvedBy: `${approver}`, // メンション形式も残しておく
    approvedByName, // ★ 承認者の表示名（新規追加）
    guildName: guild?.name || null, // ★ サーバー名も一応保持
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
  if (!diff) return; // 承認金額に変化がないときは月・年は触らない

  const ymd = parseYmdParts(dateStr);
  if (!ymd) return;
  const { yyyy, mm } = ymd;
  const monthKey = `${yyyy}-${mm}`;
  
  // ---------------- 月別ファイル ----------------
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

  // ---------------- 年別ファイル ----------------
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
