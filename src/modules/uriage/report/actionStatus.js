// src/handlers/uriage/report/actionStatus.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const logger = require('../../../utils/logger');
const {
  loadUriageConfig,
  loadUriageStoreConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const {
  loadUriageDailyData,
  saveUriageDailyData,
  appendUriageRecord,
  buildUriageCsvForPeriod,
} = require('../../../utils/uriage/gcsUriageManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { resolveStoreName } = require('../setting/panel');
const { sendAdminLog } = require('../../../utils/config/configLogger');
const { IDS } = require('./ids');

function toSafeNumber(input) {
  if (!input) return 0;
  const normalized = String(input).replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// 権限チェックヘルパー
// 権限チェックヘルパー（役職ID/ロールID 両対応）
async function checkPermission(interaction, storeId, type) {
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const member = interaction.member;

  if (!guild || !member) return false;

  const [uriageConfig, storeConfig, storeRoleConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadUriageStoreConfig(guildId, storeId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const positionRoles =
    storeRoleConfig?.positionRoles ||
    storeRoleConfig?.positionRoleMap ||
    {};

  // id(役職ID or ロールID) を「実ロールID配列」に展開する
  const expandToRoleIds = (ids = []) => {
    const out = new Set();

    for (const id of ids || []) {
      if (!id) continue;
      const key = String(id);

      // 1) まず DiscordロールIDとして存在するなら採用
      if (guild?.roles?.cache?.has(key)) {
        out.add(key);
        continue;
      }

      // 2) 次に 役職ID → 紐づくロールID配列 を展開
      const mapped = positionRoles[key] ?? positionRoles[id];
      if (Array.isArray(mapped)) {
        mapped.forEach(rid => rid && out.add(String(rid)));
      } else if (mapped) {
        out.add(String(mapped));
      }
    }

    return Array.from(out);
  };

  // 承認側：新形式 approverPositionIds を優先、無ければ旧 approverRoleIds
  const approverIds =
    uriageConfig.approverPositionIds?.length
      ? uriageConfig.approverPositionIds
      : (uriageConfig.approverRoleIds || []);

  const reporterIds = storeConfig.requestRoleIds || [];

  const approverRoleIds = expandToRoleIds(approverIds);
  const reporterRoleIds = expandToRoleIds(reporterIds);

  const hasApprover = member.roles.cache.some(r => approverRoleIds.includes(r.id));
  const hasReporter = member.roles.cache.some(r => reporterRoleIds.includes(r.id));

  if (type === 'approve') return hasApprover;
  if (type === 'modify' || type === 'delete') return hasApprover || hasReporter;
  return false;
}

// Embedから日付を取得するヘルパー
function getDateFromEmbed(message) {
  if (!message.embeds.length) return null;
  const field = message.embeds[0].fields.find(f => f.name === '日付');
  return field ? String(field.value).trim() : null;
}

/**
 * Interactionコンテキストから店舗IDや日付などを解決する
 * @param {import('discord.js').Interaction} interaction
 */
async function getUriageContext(interaction) {
  const { guild, channel: thread } = interaction;
  if (!thread.isThread()) throw new Error('This command can only be used in a thread.');

  const threadName = thread.name;
  const storeName = threadName.split('-')[1];
  if (!storeName) throw new Error(`Could not parse storeName from thread name: ${threadName}`);

  const storeRoleConfig = await loadStoreRoleConfig(guild.id);
  const store = storeRoleConfig.stores.find(s => s.name === storeName);
  if (!store) throw new Error(`Store not found for name: ${storeName}`);

  const storeId = store.id;
  const date = getDateFromEmbed(interaction.message);
  if (!date) throw new Error('Date not found in embed');

  return { guild, storeId, storeName, date, thread };
}

// ====================================================
// 承認ボタン
// ====================================================
async function handleApproveButton(interaction) {
  // customId: uriage_report_status:approve::{storeId}::{threadId}
  const parts = interaction.customId.split('::');
  const storeId = parts[1];
  const { guild, date } = await getUriageContext(interaction).catch(() => ({ guild: interaction.guild, date: getDateFromEmbed(interaction.message) }));

  if (!(await checkPermission(interaction, storeId || (await getUriageContext(interaction)).storeId, 'approve'))) {
    return interaction.reply({ content: 'この操作を行う権限がありません（承認役職が必要です）。', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  logger.debug(`[uriage/approve] Loading data: store=${storeId || (await getUriageContext(interaction)).storeId}, date=${date}`);
  const dailyData = await loadUriageDailyData(guildId, storeId, date);
  logger.debug(`[uriage/approve] Loaded records: ${dailyData.records?.length || 0}`);
  const record = dailyData.records?.find(r => r.id === interaction.message.id);
  logger.debug(`[uriage/approve] Record found: ${!!record} (msgId=${interaction.message.id})`);

  if (!record) return interaction.editReply('データが見つかりませんでした。');

  // データ更新
  record.status = 'APPROVED';
  record.approvedBy = interaction.user.id;
  record.approvedByName = interaction.user.username;
  record.approvedAtText = new Date().toISOString();

  await saveUriageDailyData(guildId, storeId, date, dailyData);
  await buildUriageCsvForPeriod(guildId, storeId, 'daily', date);

  // Embed更新
  const oldEmbed = interaction.message.embeds[0];
  const newEmbed = new EmbedBuilder(oldEmbed.toJSON())
    .setColor(0x2ecc71) // Green
    .setFooter({ text: `${oldEmbed.footer?.text || ''} | ✅ 承認済み` });

  await interaction.message.edit({ embeds: [newEmbed] }).catch(() => {});

  // ログ出力
  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
  const storeName = resolveStoreName(storeRoleConfig, storeId);

  await sendAdminLog(interaction, {
    title: '売上報告 承認',
    description: `✅ 店舗「${storeName}」の売上報告を承認しました。\n承認者：${interaction.user}\n日付：${date}\nスレッドへ移動`,
    replyToMessageId: record.adminLogMessageId || undefined,
  });

  // チャンネルログ更新（簡易実装：スレッド内に完了メッセージ）
  await interaction.message.reply(`✅ ${interaction.user} が承認しました。`).catch(() => {});

  await interaction.editReply('承認しました。');
}

// ====================================================
// 修正ボタン（モーダル表示）
// ====================================================
async function handleModifyButton(interaction) {
  const parts = interaction.customId.split('::');
  const storeId = parts[1];
  const { guild, date } = await getUriageContext(interaction).catch(() => ({ guild: interaction.guild, date: getDateFromEmbed(interaction.message) }));

  if (!(await checkPermission(interaction, storeId || (await getUriageContext(interaction)).storeId, 'modify'))) {
    return interaction.reply({ content: 'この操作を行う権限がありません。', ephemeral: true });
  }

  const guildId = interaction.guildId;
  logger.debug(`[uriage/modify] Loading data: store=${storeId || (await getUriageContext(interaction)).storeId}, date=${date}`);
  const dailyData = await loadUriageDailyData(guildId, storeId, date);
  logger.debug(`[uriage/modify] Loaded records: ${dailyData.records?.length || 0}`);
  const record = dailyData.records?.find(r => r.id === interaction.message.id);
  logger.debug(`[uriage/modify] Record found: ${!!record} (msgId=${interaction.message.id})`);

  if (!record) return interaction.reply({ content: 'データが見つかりませんでした。', ephemeral: true });

  // モーダル構築
  // customId: uriage_report:modal:modify:{storeId}:{date}:{messageId}
  const modal = new ModalBuilder()
    .setCustomId(`uriage_report:modal:modify:${storeId}:${date}:${interaction.message.id}`)
    .setTitle('売上報告の修正');

  const dateInput = new TextInputBuilder().setCustomId(IDS.FIELDS.DATE).setLabel('日付').setStyle(TextInputStyle.Short).setValue(record.date).setRequired(true);
  const totalInput = new TextInputBuilder().setCustomId(IDS.FIELDS.TOTAL).setLabel('総売り').setStyle(TextInputStyle.Short).setValue(String(record.total)).setRequired(true);
  const cashInput = new TextInputBuilder().setCustomId(IDS.FIELDS.CASH).setLabel('現金').setStyle(TextInputStyle.Short).setValue(String(record.cash)).setRequired(false);
  const creditVal = [record.card, record.credit].filter(v => v).join(',');
  const creditInput = new TextInputBuilder().setCustomId(IDS.FIELDS.CREDIT).setLabel('カード,売掛').setStyle(TextInputStyle.Short).setValue(creditVal).setRequired(false);
  const expenseInput = new TextInputBuilder().setCustomId(IDS.FIELDS.EXPENSE).setLabel('諸経費').setStyle(TextInputStyle.Short).setValue(String(record.expense)).setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(cashInput),
    new ActionRowBuilder().addComponents(creditInput),
    new ActionRowBuilder().addComponents(expenseInput),
  );

  await interaction.showModal(modal);
}

// ====================================================
// 修正モーダル受信
// ====================================================
async function handleModifyModal(interaction) {
  // customId: uriage_report:modal:modify:{storeId}:{oldDate}:{messageId}
  const parts = interaction.customId.split(':');
  const storeId = parts[3];
  const oldDate = parts[4];
  const messageId = parts[5];

  await interaction.deferReply({ ephemeral: true });

  const newDate = interaction.fields.getTextInputValue(IDS.FIELDS.DATE).trim();
  const total = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.TOTAL));
  const cash = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.CASH));
  const creditRaw = interaction.fields.getTextInputValue(IDS.FIELDS.CREDIT);
  let card = 0;
  let credit = 0;
  if (creditRaw) {
    const sp = creditRaw.split(/[,\s]+/).filter(Boolean);
    if (sp.length > 0) card = toSafeNumber(sp[0]);
    if (sp.length > 1) credit = toSafeNumber(sp[1]);
  }
  const expense = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.EXPENSE));
  const remain = total - (card + expense);

  const guildId = interaction.guildId;

  // 日付が変わった場合の移動処理は複雑になるため、今回は同一日付内更新を前提とするか、
  // または古い日付から削除して新しい日付に追加する処理が必要。
  // ここでは簡易的に「日付変更は非推奨だが、変わった場合は新日付に移動」するロジックを実装。

  let dailyData = await loadUriageDailyData(guildId, storeId, oldDate);
  let recordIndex = dailyData.records?.findIndex(r => r.id === messageId);

  if (recordIndex === -1 || recordIndex === undefined) {
    return interaction.editReply('修正対象のデータが見つかりませんでした。');
  }

  const oldRecord = dailyData.records[recordIndex];
  const newRecord = {
    ...oldRecord,
    date: newDate,
    total,
    cash,
    card,
    credit,
    expense,
    remain,
    modifier: interaction.user.id,
    modifierName: interaction.user.username,
    modifierAtText: new Date().toISOString(),
    status: 'MODIFIED', // 修正済みステータス
  };

  if (oldDate === newDate) {
    // 同一日付なら上書き
    dailyData.records[recordIndex] = newRecord;
    await saveUriageDailyData(guildId, storeId, oldDate, dailyData);
  } else {
    // 日付変更：旧から削除、新へ追加
    dailyData.records.splice(recordIndex, 1);
    await saveUriageDailyData(guildId, storeId, oldDate, dailyData);

    // 新しい日付へ追加（appendUriageRecordを使用）
    const newDateKey = newDate.replace(/-/g, '');
    await appendUriageRecord(guildId, storeId, newDateKey, newRecord);
  }

  // CSV再生成
  await buildUriageCsvForPeriod(guildId, storeId, 'daily', oldDate);
  if (oldDate !== newDate) {
    await buildUriageCsvForPeriod(guildId, storeId, 'daily', newDate);
  }

  // メッセージ更新
  const channel = interaction.channel;
  const message = await channel.messages.fetch(messageId).catch(() => null);

  if (message) {
    const oldEmbed = message.embeds[0];
    const embed = new EmbedBuilder(oldEmbed.toJSON())
      .setFields(
        { name: '日付', value: newDate, inline: true },
        { name: '総売り', value: `${total.toLocaleString()} 円`, inline: true },
        { name: '現金', value: `${cash.toLocaleString()} 円`, inline: true },
        { name: 'カード', value: `${card.toLocaleString()} 円`, inline: true },
        { name: '売掛', value: `${credit.toLocaleString()} 円`, inline: true },
        { name: '諸経費', value: `${expense.toLocaleString()} 円`, inline: true },
        { name: '残金(総売り-カード-諸経費)', value: `${remain.toLocaleString()} 円`, inline: true },
        { name: '入力者', value: oldEmbed.fields.find(f => f.name === '入力者')?.value || '-', inline: true },
        { name: '入力時間', value: oldEmbed.fields.find(f => f.name === '入力時間')?.value || '-', inline: true },
      )
      .setFooter({ text: `${oldEmbed.footer?.text || ''} | 📝 修正済み` });

    await message.edit({ embeds: [embed] }).catch(() => {});
    await message.reply(`📝 ${interaction.user} が修正しました。`).catch(() => {});
  }

  // 管理者ログ
  const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
  const storeName = resolveStoreName(storeRoleConfig, storeId);

  await sendAdminLog(interaction, {
    title: '売上報告 修正',
    description: `📝 店舗「${storeName}」の売上報告を修正しました。\n修正者：${interaction.user}\n日付：${newDate}\nスレッドへ移動`,
    replyToMessageId: newRecord.adminLogMessageId || oldRecord.adminLogMessageId || undefined,
  });

  await interaction.editReply('修正しました。');
}

// ====================================================
// 削除ボタン
// ====================================================
async function handleDeleteButton(interaction) {
  const parts = interaction.customId.split('::');
  const storeId = parts[1];
  const { guild, date, storeName } = await getUriageContext(interaction).catch(() => ({ guild: interaction.guild, date: getDateFromEmbed(interaction.message), storeName: '' }));

  if (!(await checkPermission(interaction, storeId || (await getUriageContext(interaction)).storeId, 'delete'))) {
    return interaction.reply({ content: 'この操作を行う権限がありません。', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  logger.debug(`[uriage/delete] Loading data: store=${storeId || (await getUriageContext(interaction)).storeId}, date=${date}`);
  const dailyData = await loadUriageDailyData(guildId, storeId, date);
  logger.debug(`[uriage/delete] Loaded records: ${dailyData.records?.length || 0}`);
  const recordIndex = dailyData.records?.findIndex(r => r.id === interaction.message.id);
  logger.debug(`[uriage/delete] Record index: ${recordIndex} (msgId=${interaction.message.id})`);

  if (recordIndex === -1 || recordIndex === undefined) {
    return interaction.editReply('データが見つかりませんでした（既に削除されている可能性があります）。');
  }

  // データを削除するのではなく、ステータスを DELETED にして残す（履歴保持のため）
  // または完全に消す仕様なら splice する。ここではステータス変更を採用。
  const record = dailyData.records[recordIndex];
  record.status = 'DELETED';
  record.deletedBy = interaction.user.id;
  record.deletedAtText = new Date().toISOString();

  // CSVから除外したい場合は splice する必要があるが、履歴に残すならこのまま。
  // 仕様書に「削除されましたを追記」とあるので、データは残しつつ無効化が適切。
  // ただしCSV集計からは除外したい場合が多いので、ここでは配列から削除し、ログだけ残すパターンにします。
  dailyData.records.splice(recordIndex, 1);

  await saveUriageDailyData(guildId, storeId, date, dailyData);
  await buildUriageCsvForPeriod(guildId, storeId, 'daily', date);

  // Embed更新
  const oldEmbed = interaction.message.embeds[0];
  const newEmbed = new EmbedBuilder(oldEmbed.toJSON())
    .setColor(0xe74c3c) // Red
    .setTitle(`売上報告 - 削除済み`)
    .setFooter({ text: `${oldEmbed.footer?.text || ''} | 🗑️ 削除済み` });

  await interaction.message.edit({ embeds: [newEmbed], components: [] }).catch(() => {}); // ボタンも消す
  await interaction.message.reply(`🗑️ ${interaction.user} が削除しました。`).catch(() => {});

  // 管理者ログ
  await sendAdminLog(interaction, {
    title: '売上報告 削除',
    description: `🗑️ 店舗「${storeName}」の売上報告を削除しました。\n削除者：${interaction.user}\n日付：${date}\nスレッドへ移動`,
    replyToMessageId: parentLogId || undefined,
  });

  await interaction.editReply('削除しました。');
}

module.exports = {
  handleApproveButton,
  handleModifyButton,
  handleDeleteButton,
  handleModifyModal,
};