// src/handlers/uriage/report/reportFlow.js
// 売上報告ボタン → モーダル → スレッド + ログ出力 + JSON/CSV 保存
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const logger = require('../../../utils/logger');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { resolveStoreName, refreshUriageSettingPanelMessage, sendUriagePanel } = require('../setting/panel');
const {
  buildUriageCsvForPeriod,
  appendUriageRecord,
} = require('../../../utils/uriage/gcsUriageManager');
const {
  loadUriageConfig,
  loadUriageStoreConfig,
  saveUriageStoreConfig,
} = require('../../../utils/uriage/uriageConfigManager');
const { sendSettingLog, sendAdminLog } = require('../../../utils/config/configLogger');
const { IDS } = require('./ids');
const { upsertChannelLog } = require('../../../modules/common/channelLog/upsertChannelLog');
const { sendAdminLogMessage } = require('../../../modules/common/adminLog/sendAdminLogMessage');
const { STATUS_IDS } = require('./statusIds');

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toSafeNumber(input) {
  if (!input) return 0;
  const normalized = String(input).replace(/[^\d.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// 売上報告ボタン
async function handleReportButton(interaction) {
  const customId = interaction.customId; // uriage_report:btn:report:{storeId}
  const parts = customId.split(':');
  const storeId = parts[parts.length - 1];

  const modal = new ModalBuilder()
    .setCustomId(`${IDS.MODAL.REPORT}::${storeId}`)
    .setTitle('売上報告');

  const dateInput = new TextInputBuilder()
    .setCustomId(IDS.FIELDS.DATE)
    .setLabel('日付(YYYY-MM-DD)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(todayStr());

  const totalInput = new TextInputBuilder()
    .setCustomId(IDS.FIELDS.TOTAL)
    .setLabel('総売り')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const cashInput = new TextInputBuilder()
    .setCustomId(IDS.FIELDS.CASH)
    .setLabel('現金')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const creditInput = new TextInputBuilder()
    .setCustomId(IDS.FIELDS.CREDIT)
    .setLabel('カード,売掛（例：5000,1000）')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const expenseInput = new TextInputBuilder()
    .setCustomId(IDS.FIELDS.EXPENSE)
    .setLabel('諸経費')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(cashInput),
    new ActionRowBuilder().addComponents(creditInput),
    new ActionRowBuilder().addComponents(expenseInput),
  );

  await interaction.showModal(modal);
}

// モーダル送信後
async function handleReportModal(interaction) {
  const customId = interaction.customId; // uriage_report:modal::{storeId}
  const parts = customId.split('::');
  const storeId = parts[parts.length - 1];
  if (!storeId) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const date = interaction.fields.getTextInputValue(IDS.FIELDS.DATE).trim();
    const total = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.TOTAL));
    const cash = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.CASH));
    const creditRaw = interaction.fields.getTextInputValue(IDS.FIELDS.CREDIT);
    let card = 0;
    let credit = 0;
    if (creditRaw) {
      const partsSplit = creditRaw.split(/[,\s]+/).filter(Boolean);
      if (partsSplit.length > 0) card = toSafeNumber(partsSplit[0]);
      if (partsSplit.length > 1) credit = toSafeNumber(partsSplit[1]);
    }
    const expense = toSafeNumber(interaction.fields.getTextInputValue(IDS.FIELDS.EXPENSE));

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      await interaction.editReply({ content: '日付は YYYY-MM-DD 形式で入力してください。' });
      return;
    }
    if (!total || total <= 0) {
      await interaction.editReply({ content: '総売りは1以上の数値で入力してください。' });
      return;
    }

    // 残金は 総売り - (カード + 諸経費)
    const remain = total - (card + expense);

    const guild = interaction.guild;
    const guildId = guild.id;
    const [uriageConfig, storeRoleConfig, storeConfig] = await Promise.all([
      loadUriageConfig(guildId),
      loadStoreRoleConfig(guild.id).catch(() => null),
      loadUriageStoreConfig(guildId, storeId),
    ]);
    const storeName = resolveStoreName(storeRoleConfig, storeId);

    const channel = interaction.channel;
    const threadName = `${date.replace(/-/g, '').slice(0, 6)}-${storeName}-売上報告`;
    let thread = channel.threads.cache.find(t => t.name === threadName && !t.archived);
    if (!thread) {
      const active = await channel.threads.fetchActive();
      thread = active.threads.find(t => t.name === threadName);
    }
    if (!thread) {
      thread = await channel.threads.create({
        name: threadName,
        autoArchiveDuration: 1440,
        reason: '売上報告スレッド作成',
        type: ChannelType.PrivateThread,
      });
    }

    // ロールを持つメンバーを追加（承認役職 + 店舗閲覧/申請役職 + 申請者）
    try {
      const allowedRoleIds = new Set([
        ...(uriageConfig.approverRoleIds || []),
        ...(storeConfig.viewRoleIds || []),
        ...(storeConfig.requestRoleIds || []),
      ]);
      if (allowedRoleIds.size) {
        const members = await guild.members.fetch();
        for (const m of members.values()) {
          if (m.roles.cache.some(r => allowedRoleIds.has(r.id))) {
            await thread.members.add(m.id).catch(() => {});
          }
        }
      }
      await thread.members.add(interaction.user.id).catch(() => {});
    } catch (e) {
      logger.warn('[uriage/reportFlow] スレッドへのメンバー追加に失敗しました', e);
    }

    // 共通テンプレートを使用してボタンを生成
    const components = buildApplyActionRows({
      feature: 'uriage',
      targetId: thread.id,
      options: { hideApplicantActions: true }, // 以前の実装に合わせて申請者ボタンは非表示
    });

    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`売上報告 - ${storeName}`)
      .addFields(
        { name: '日付', value: date, inline: true },
        { name: '総売り', value: `${total.toLocaleString()} 円`, inline: true },
        { name: '現金', value: `${cash.toLocaleString()} 円`, inline: true },
        { name: 'カード', value: `${card.toLocaleString()} 円`, inline: true },
        { name: '売掛', value: `${credit.toLocaleString()} 円`, inline: true },
        { name: '諸経費', value: `${expense.toLocaleString()} 円`, inline: true },
        { name: '残金(総売り-カード-諸経費)', value: `${remain.toLocaleString()} 円`, inline: true },
        { name: '入力者', value: `${interaction.user}`, inline: true },
        { name: '入力時間', value: `<t:${nowUnix}:f>`, inline: true },
      )
      .setFooter({ text: `店舗: ${storeName}` })
      .setTimestamp(now);

    const threadMessage = await thread.send({ embeds: [embed], components });

    // チャンネルログ送信（編集更新型・テキスト版）
    const channelLogMessageId = await upsertChannelLog({
      channel: channel,
      payload: {
      functionName: '売上',
        storeName: storeName,
        dateLabel: date,
        threadName: thread.name,
        threadUrl: thread.url,
        applicantUser: interaction.user,
        appliedAt: now,
        status: 'pending',
      },
    });

    // 管理者ログ（設定ログ）へ出力
    // ※ データ保存前に送信して、メッセージIDを取得する
    let adminLogMessageId = null;
    const adminLogChannel = guild.channels.cache.find(ch => ch.name === '管理者ログ');

    try {
      if (adminLogChannel) {
        const msg = await sendAdminLogMessage({
          logChannel: adminLogChannel,
          payload: {
            functionName: '売上',
            storeName: storeName,
            dateLabel: date,
            threadName: thread.name,
            threadUrl: thread.url,
            actorUser: interaction.user,
            actedAt: now,
            actionType: 'apply',
          },
        });
        if (msg) adminLogMessageId = msg.id;
      }
    } catch (e) {
      logger.warn('[uriage/reportFlow] 管理者ログ送信に失敗しました', e);
    }

    // データ保存（日別） + 既存CSVの再生成
    try {
      const dateKey = date.replace(/-/g, '');

      const record = {
        id: threadMessage.id,
        status: '申請中',
        date,
        total,
        cash,
        card,
        credit,
        expense,
        remain,
        requesterId: interaction.user.id,
        requesterName: interaction.member?.displayName || interaction.user.username,
        requestAtText: new Date().toISOString(),
        adminLogMessageId,
        adminLogChannelId: adminLogChannel?.id || null,
        channelLogMessageId, // チャンネルログのIDも保存
      };

      await appendUriageRecord(guildId, storeId, dateKey, record);

      await buildUriageCsvForPeriod(guildId, storeId, 'daily', date);
    } catch (err) {
      logger.warn('[uriage/reportFlow] データ保存エラー:', err);
    }

    // 設定パネルを再送信（最新化）
    try {
      await refreshUriageSettingPanelMessage(guild, await loadUriageConfig(guildId));
    } catch (e) {
      logger.warn('[uriage/reportFlow] 設定パネル再描画に失敗しました', e);
    }

    // 売上報告パネルを最新化（旧メッセージ削除 → 再送信）
    try {
      const storeConf = await loadUriageStoreConfig(guildId, storeId);
      if (storeConf.channelId && storeConf.messageId) {
        const ch = await guild.channels.fetch(storeConf.channelId).catch(() => null);
        if (ch && ch.isTextBased()) {
          await ch.messages.delete(storeConf.messageId).catch(() => {});
        }
      }
      if (storeConf.channelId) {
        const ch = await guild.channels.fetch(storeConf.channelId).catch(() => null);
        if (ch && ch.isTextBased()) {
          const newPanel = await sendUriagePanel(ch, storeId);
          // config のメッセージIDも更新しておく
          const latestStoreConf = await loadUriageStoreConfig(guildId, storeId);
          latestStoreConf.messageId = newPanel?.id || latestStoreConf.messageId;
          await saveUriageStoreConfig(guildId, storeId, latestStoreConf);
        }
      }
    } catch (e) {
      logger.warn('[uriage/reportFlow] 売上報告パネル再送信に失敗しました', e);
    }

    await interaction.editReply({
      content: `売上報告を作成しました。\n${threadMessage.url}`,
    });
  } catch (err) {
    logger.error('[uriage/reportFlow] モーダル処理中エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '売上報告の処理中にエラーが発生しました。詳細はログを確認してください。',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.editReply({
        content: '売上報告の処理中にエラーが発生しました。詳細はログを確認してください。',
      }).catch(() => {});
    }
  }
}

module.exports = {
  handleReportButton,
  handleReportModal,
};
