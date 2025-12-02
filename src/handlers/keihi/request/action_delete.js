// src/handlers/keihi/request/action_delete.js
// ----------------------------------------------------
// 経費申請「削除」ボタンの処理
// ----------------------------------------------------

const { MessageFlags } = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
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
 * 削除ボタン押下時
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleDeleteButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  // customId 形式:
  //   keihi_request_delete::{storeId}::{threadId}::{messageId}
  // または buildStatusButtons 経由で:
  //   keihi_request_delete::{storeId}::{threadId}::{messageId}::{status}
  const parts = customId.split('::');
  const [prefix, storeId, threadId, messageId] = parts;
  // const status = parts[4] || null; // 将来ステータス別制御したくなったとき用

  if (prefix !== STATUS_IDS.DELETE || !storeId || !threadId || !messageId) {
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

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.editReply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
    });
    return;
  }

  // 操作権限チェック（承認者 or 元申請者）
  const approverRoleIds = collectApproverRoleIds(keihiConfig);
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

  const storeName = resolveStoreName(storeRoleConfig, storeId);
  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const deletedAtText = `<t:${tsUnix}:f>`;

  // スレッド側のメッセージを「削除済み」としてマーク（embed は残す）
  await message.edit({
    content: `❌ 経費申請　削除しました　削除者：${member}　削除時間：${deletedAtText}`,
    embeds: [baseEmbed],
    components: [],
  });

  // パネルチャンネル側のログメッセージにも削除情報を追記
  const parentChannel = thread.isThread() && thread.parent ? thread.parent : thread;
  const logMessageId = baseEmbed.footer?.text?.startsWith('LogID: ')
    ? baseEmbed.footer.text.slice('LogID: '.length)
    : null;

  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages.fetch(logMessageId).catch(() => null);
    if (logMessage) {
      const extra = [
        '×経費申請が削除されました。',
        `削除者：${member}　削除時間：${deletedAtText}`,
        `スレッドメッセージリンク：${message.url}`,
      ].join('\n');
      const newLogContent = `${logMessage.content}\n${extra}`;
      await logMessage.edit({ content: newLogContent });
    }
  }

  // ---------- ここで 年月日ファイルから減算 ----------
  try {
    await updateKeihiStatsOnDelete({
      guildId,
      storeId,
      baseEmbed,
      threadMessage: message,
      deleter: member,
    });
  } catch (e) {
    console.error('[keihi] 年月日ファイル削除時更新中にエラー:', e);
  }

  const originalDate = getEmbedFieldValue(baseEmbed, '日付');
  const originalDepartment = getEmbedFieldValue(baseEmbed, '部署');
  const originalItemName = getEmbedFieldValue(baseEmbed, '経費項目');

  await sendSettingLog(interaction, {
    title: '経費申請削除',
    description:
      `❌ 店舗「${storeName}」の経費申請を削除しました。\n` +
      `削除者：${member}　削除時間：${deletedAtText}\n` +
      `日付：${originalDate}　部署：${originalDepartment}　経費項目：${originalItemName}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を削除しました。' });
}

/**
 * 削除時に 日・月・年 の集計ファイルを更新
 * （既に承認されていた分だけ差し引く）
 */
async function updateKeihiStatsOnDelete({
  guildId,
  storeId,
  baseEmbed,
  threadMessage,
  deleter,
}) {
  const dateStrRaw = getEmbedFieldValue(baseEmbed, '日付') || '';
  const dateStr = dateStrRaw.trim();
  if (!dateStr) return;

  const ymd = parseYmdParts(dateStr);
  if (!ymd) return;
  const { yyyy, mm } = ymd;
  const monthKey = `${yyyy}-${mm}`;

  const nowIso = new Date().toISOString();

  // -------- 日別 --------
  const dailyData = (await loadKeihiDailyData(guildId, storeId, dateStr)) || {};
  if (!Array.isArray(dailyData.requests)) return;

  const record = dailyData.requests.find((r) => r.id === threadMessage.id);
  if (!record) return;

  const prevApprovedAmount =
    record.status === 'APPROVED' ? Number(record.amount || 0) : 0;
  if (!prevApprovedAmount) {
    // そもそも承認されていなかった場合は統計への影響なし
    record.status = 'DELETED';
    record.deletedById = deleter.id;
    record.deletedBy = `${deleter}`;
    record.deletedAt = nowIso;
    record.updatedAt = nowIso;
    await saveKeihiDailyData(guildId, storeId, dateStr, dailyData);
    return;
  }

  // ステータス変更
  record.status = 'DELETED';
  record.deletedById = deleter.id;
  record.deletedBy = `${deleter}`;
  record.deletedAt = nowIso;
  record.updatedAt = nowIso;

  dailyData.totalApprovedAmount = dailyData.requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  dailyData.lastUpdated = nowIso;

  await saveKeihiDailyData(guildId, storeId, dateStr, dailyData);

  const diff = -prevApprovedAmount; // 承認済み分をマイナス

  // -------- 月別 --------
  const monthlyData =
    (await loadKeihiMonthlyData(guildId, storeId, dateStr)) || {};
  monthlyData.guildId = guildId;
  monthlyData.storeId = storeId;
  monthlyData.month = monthKey;
  monthlyData.byDay = monthlyData.byDay || {};

  monthlyData.byDay[dateStr] =
    (Number(monthlyData.byDay[dateStr]) || 0) + diff;
  if (monthlyData.byDay[dateStr] < 0) monthlyData.byDay[dateStr] = 0;

  monthlyData.totalApprovedAmount = Object.values(monthlyData.byDay).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );
  monthlyData.lastUpdated = nowIso;

  await saveKeihiMonthlyData(guildId, storeId, dateStr, monthlyData);

  // -------- 年別 --------
  const yearlyData =
    (await loadKeihiYearlyData(guildId, storeId, dateStr)) || {};
  yearlyData.guildId = guildId;
  yearlyData.storeId = storeId;
  yearlyData.year = yyyy;
  yearlyData.byMonth = yearlyData.byMonth || {};

  yearlyData.byMonth[monthKey] =
    (Number(yearlyData.byMonth[monthKey]) || 0) + diff;
  if (yearlyData.byMonth[monthKey] < 0) yearlyData.byMonth[monthKey] = 0;

  yearlyData.totalApprovedAmount = Object.values(yearlyData.byMonth).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );
  yearlyData.lastUpdated = nowIso;

  await saveKeihiYearlyData(guildId, storeId, dateStr, yearlyData);
}

module.exports = { handleDeleteButton };
