// src/handlers/keihi/request/action_modify.js
// ----------------------------------------------------
// 経費申請「修正」ボタン & 修正モーダル処理
//   - 修正ボタン押下でモーダル表示（既存値を埋め込む）
//   - モーダル送信で Embed / ログ / JSON を更新
//   - embedカラー：修正 = 青
//   - 管理者ログ②（修正）は、管理者ログ①（申請）に返信（AdminLogID が取れた時）
// ----------------------------------------------------

const {
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog, sendAdminLog } = require('../../../utils/config/configLogger');

const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
  blankField,
  stripTilde,
  parseKeihiLogIdFromFooter,
  parseAdminLogIdFromKeihiLogContent,
} = require('./statusHelpers');

const { IDS: STATUS_IDS } = require('./statusIds');
const logger = require('../../../utils/logger');
const { resolveStoreName } = require('../setting/storeNameResolver');

const {
  loadKeihiDailyData,
  saveKeihiDailyData,
} = require('../../../utils/keihi/gcsKeihiManager');

// ----------------------------------------------------
// 色：申請/修正=青、承認=緑、削除=赤
// ----------------------------------------------------
const COLORS = {
  BLUE: 0x5865f2,
  GREEN: 0x57f287,
  RED: 0xed4245,
};

function toModalValue(v) {
  const s = stripTilde(v);
  if (!s || s === '未入力' || s === '不明') return '';
  return s;
}

// keihiLog の修正者行を更新（無ければ末尾線の前に追加）
function updateChannelLogOnModify(content, modifierMention, modifiedAtText) {
  let c = String(content || '');

  if (/^修正者：/m.test(c)) {
    c = c.replace(
      /^修正者：.*$/m,
      `修正者：${modifierMention}　修正時間：${modifiedAtText}`,
    );
  } else {
    c = c.replace(
      /------------------------------\s*$/m,
      `修正者：${modifierMention}　修正時間：${modifiedAtText}\n------------------------------`,
    );
  }
  return c;
}

function buildDiffLines(before, after) {
  const lines = [];
  const map = [
    { k: 'date', label: '日付' },
    { k: 'department', label: '部署' },
    { k: 'item', label: '経費項目' },
    { k: 'amount', label: '金額' },
    { k: 'note', label: '備考' },
  ];

  for (const { k, label } of map) {
    if (before[k] !== after[k]) {
      lines.push(`・${label}：${before[k] || '未入力'} → ${after[k] || '未入力'}`);
    }
  }
  return lines.join('\n');
}

// ----------------------------------------------------
// 修正ボタン押下 → モーダル表示
// ----------------------------------------------------

/**
 * 修正ボタン押下 → モーダル表示
 */
async function handleModifyButton(interaction) {
  const { customId, guild, member } = interaction;
  if (!guild) return;

  // showModal は最初の応答。すでに ack 済みなら落とさない
  if (interaction.deferred || interaction.replied) {
    logger.warn('[keihi/modify] showModal skipped: already acknowledged', {
      customId,
      deferred: interaction.deferred,
      replied: interaction.replied,
    });
    return;
  }

  const guildId = guild.id;

  // keihi_request_modify::{storeId}::{threadId}::{messageId}
  const parts = customId.split('::');
  const [, storeId, threadId, messageId] = parts;
  if (!storeId || !threadId || !messageId) return;

  const thread = await guild.channels.fetch(threadId).catch(() => null);
  if (!thread || !thread.isThread()) {
    await interaction.reply({
      content: '対象のスレッドが見つかりませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const message = await thread.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.reply({
      content: '対象のメッセージが見つかりませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const [keihiConfig, storeRoleConfig] = await Promise.all([
    loadKeihiConfig(guildId),
    loadStoreRoleConfig(guildId).catch(() => null),
  ]);

  const baseEmbed = message.embeds?.[0];
  if (!baseEmbed) {
    await interaction.reply({
      content: '対象の経費申請メッセージが見つかりませんでした。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 権限チェック
  const approverRoleIds = collectApproverRoleIds(keihiConfig);
  if (!approverRoleIds.length) {
    await interaction.reply({
      content: '承認役職が設定されていないため、修正できません。',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { hasPermission, message: permError } = checkStatusActionPermission(
    'modify',
    member,
    baseEmbed,
    approverRoleIds,
  );
  if (!hasPermission) {
    await interaction.reply({ content: permError, flags: MessageFlags.Ephemeral });
    return;
  }

  const storeName = resolveStoreName(storeRoleConfig, storeId);

  // 既存値（~~を剥がす/未入力は空）
  const date = toModalValue(getEmbedFieldValue(baseEmbed, '日付'));
  const department = toModalValue(getEmbedFieldValue(baseEmbed, '部署'));
  const item = toModalValue(getEmbedFieldValue(baseEmbed, '経費項目'));

  const amountRaw = stripTilde(getEmbedFieldValue(baseEmbed, '金額'));
  const amount = amountRaw.replace(/[^\d]/g, '');

  const note = toModalValue(getEmbedFieldValue(baseEmbed, '備考'));

  // 修正用モーダル
  const modal = new ModalBuilder()
    .setCustomId(`${STATUS_IDS.MODIFY_MODAL}::${storeId}::${threadId}::${messageId}`)
    .setTitle(`経費申請を修正：${storeName}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('date')
        .setLabel('日付（YYYY-MM-DD）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(date || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('department')
        .setLabel('部署')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(department || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item')
        .setLabel('経費項目')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(item || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('金額（半角数字）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(amount || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('note')
        .setLabel('備考')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(note || ''),
    ),
  );

  await interaction.showModal(modal);
}

/**
 * 修正モーダル送信時
 */
async function handleModifyModalSubmit(interaction) {
  try {
    const customId = interaction.customId; // keihi_request_modify_modal::storeId::threadId::messageId
    const [, storeId, threadId, messageId] = customId.split('::');
    if (!storeId || !threadId || !messageId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) return;
    const guildId = guild.id;

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
      await interaction.editReply({ content: '承認役職が設定されていないため、修正できません。' });
      return;
    }

    const baseEmbed = message.embeds?.[0];
    if (!baseEmbed) {
      await interaction.editReply({ content: '経費申請メッセージが見つかりませんでした。' });
      return;
    }

    const { hasPermission, message: permError } = checkStatusActionPermission(
      'modify',
      interaction.member,
      baseEmbed,
      approverRoleIds,
    );
    if (!hasPermission) {
      await interaction.editReply({ content: permError });
      return;
    }

    // 入力値取得
    const date = (interaction.fields.getTextInputValue('date') || '').trim() || '';
    const department = (interaction.fields.getTextInputValue('department') || '').trim();
    const item = (interaction.fields.getTextInputValue('item') || '').trim();
    const amount = Number(((interaction.fields.getTextInputValue('amount') || '')).replace(/[^\d]/g, ''));
    const note = (interaction.fields.getTextInputValue('note') || '').trim();

    if (!date || !item || !Number.isFinite(amount) || amount <= 0) {
      await interaction.editReply({ content: '日付・項目・金額を正しく入力してください。' });
      return;
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);

    const now = new Date();
    const tsUnix = Math.floor(now.getTime() / 1000);
    const modifiedAtText = `<t:${tsUnix}:f>`;

    // 既存（保持）
    const requester = stripTilde(getEmbedFieldValue(baseEmbed, '入力者')) || '未入力';
    const requestAt = stripTilde(getEmbedFieldValue(baseEmbed, '入力時間')) || '未入力';
    const approver = stripTilde(getEmbedFieldValue(baseEmbed, '承認者')) || '未入力';
    const approvedAt = stripTilde(getEmbedFieldValue(baseEmbed, '承認時間')) || '未入力';

    // footer（LogID）
    const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

    // before/after（差分用）
    const before = {
      date: stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '',
      department: stripTilde(getEmbedFieldValue(baseEmbed, '部署')) || '',
      item: stripTilde(getEmbedFieldValue(baseEmbed, '経費項目')) || '',
      amount: stripTilde(getEmbedFieldValue(baseEmbed, '金額')) || '',
      note: stripTilde(getEmbedFieldValue(baseEmbed, '備考')) || '',
    };

    const after = {
      date,
      department,
      item,
      amount: `${amount.toLocaleString()} 円`,
      note: note || '未入力',
    };

    const diffText = buildDiffLines(before, after);

    // Embed 更新（修正=青 / レイアウト統一）
    const newEmbed = new EmbedBuilder()
      .setTitle('✏️ 経費申請　修正しました')
      .setColor(COLORS.BLUE) // ✅ 修正: 青
      .addFields(
        // 1列目
        { name: 'ステータス', value: '📝 修正済み', inline: true },
        { name: '日付', value: date, inline: true },
        { name: '部署', value: department || '未入力', inline: true },
        // 2列目
        { name: '経費項目', value: item, inline: true },
        { name: '金額', value: `${amount.toLocaleString()} 円`, inline: true },
        { name: '備考', value: note || '未入力', inline: true },
        // 3列目
        { name: '入力者', value: requester, inline: true },
        { name: '入力時間', value: requestAt, inline: true },
        blankField(),
        // 4列目
        { name: '修正者', value: `${interaction.member}`, inline: true },
        { name: '修正時間', value: modifiedAtText, inline: true },
        blankField(),
        // 5列目
        { name: '承認者', value: approver, inline: true },
        { name: '承認時間', value: approvedAt, inline: true },
        blankField(),
      )
      .setTimestamp(now);

    if (baseEmbed.footer?.text) newEmbed.setFooter({ text: baseEmbed.footer.text });

    await message.edit({ embeds: [newEmbed], components: message.components });

    // ----------------------------------------------------
    // keihiLog（申請チャンネルログ）更新 + AdminLogID取得
    // ----------------------------------------------------
    const parentChannel = thread.parent ?? thread;

    let adminLogId = null;
    if (parentChannel && keihiLogId) {
      const logMessage = await parentChannel.messages.fetch(keihiLogId).catch(() => null);
      if (logMessage) {
        adminLogId = parseAdminLogIdFromKeihiLogContent(logMessage.content);

        const updated = updateChannelLogOnModify(
          logMessage.content,
          `${interaction.member}`,
          modifiedAtText,
        );

        if (updated !== logMessage.content) {
          await logMessage.edit({ content: updated }).catch(() => null);
        }
      }
    }

    // ----------------------------------------------------
    // 管理者ログ（②：①に返信 / 修正箇所あり / 青）
    // ----------------------------------------------------
    const adminContent =
      `経費　📝修正\n` +
      `店舗「${storeName}」\n` +
      `${date} の申請が修正されました。`;

    const adminEmbed = new EmbedBuilder()
      .setTitle(`日付：${date}`)
      .setColor(COLORS.BLUE)
      .addFields(
        { name: '修正者', value: `${interaction.member}`, inline: true },
        { name: '修正時間', value: modifiedAtText, inline: true },
        blankField(),
        { name: '修正箇所', value: diffText || '変更なし', inline: false },
        { name: 'スレッドメッセージリンク', value: message.url, inline: false },
      )
      .setTimestamp(now);

    try {
      await sendAdminLog(interaction, {
        action: 'MODIFY',
        content: adminContent,
        replyToMessageId: adminLogId || null,
        embeds: [adminEmbed],
      });
    } catch (e) {
      logger.warn('[keihi/modify] sendAdminLog failed', e);
    }

    // ----------------------------------------------------
    // JSON 更新（店舗名フォルダ）
    //  - 日付変更：旧から削除して新へ
    // ----------------------------------------------------
    const oldDate = toModalValue(getEmbedFieldValue(baseEmbed, '日付'));
    const recordId = messageId;

    if (oldDate && oldDate !== date) {
      const oldDaily = await loadKeihiDailyData(guildId, storeName, oldDate).catch(() => null);
      if (oldDaily && Array.isArray(oldDaily.requests)) {
        oldDaily.requests = oldDaily.requests.filter((r) => String(r.id) !== String(recordId));
        oldDaily.totalApprovedAmount = oldDaily.requests
          .filter((r) => r.status === 'APPROVED')
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        oldDaily.lastUpdated = now.toISOString();
        await saveKeihiDailyData(guildId, storeName, oldDate, oldDaily).catch(() => {});
      }
    }

    const dailyData = (await loadKeihiDailyData(guildId, storeName, date).catch(() => ({}))) || {};
    if (!Array.isArray(dailyData.requests)) dailyData.requests = [];

    let record = dailyData.requests.find((r) => String(r.id) === String(recordId));
    if (!record) {
      record = { id: recordId };
      dailyData.requests.push(record);
    }

    Object.assign(record, {
      status: 'MODIFIED',
      statusJa: '修正',

      date,
      department,
      item,
      amount,
      note,

      modifierId: interaction.member.id,
      modifier: `${interaction.member}`,
      modifierName:
        interaction.member.displayName ||
        interaction.member.user?.username ||
        `${interaction.member}`,

      modifierAtText: modifiedAtText,
      updatedAt: now.toISOString(),

      // 参照用
      logId: record.logId || keihiLogId || null,
    });

    dailyData.totalApprovedAmount = dailyData.requests
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    dailyData.guildId = guildId;
    dailyData.storeId = storeId;
    dailyData.date = date;
    dailyData.lastUpdated = now.toISOString();

    await saveKeihiDailyData(guildId, storeName, date, dailyData).catch(() => {});

    // 設定ログ（緑のままでOK）
    await sendSettingLog(interaction, {
      title: '経費申請修正',
      description:
        `店舗「${storeName}」の経費申請を修正しました。\n` +
        `修正者：${interaction.member}　修正時間：${modifiedAtText}\n` +
        `日付：${date}　部署：${department || '未入力'}　経費項目：${item}\n` +
        `スレッドメッセージリンク：${message.url}`,
    });

    await interaction.editReply({ content: '経費申請を修正しました。' });
  } catch (err) {
    logger.error('[keihi] handleModifyModalSubmit で予期しないエラー', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: '修正処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral })
        .catch(() => {});
    } else {
      await interaction.editReply({ content: '修正処理中にエラーが発生しました。' }).catch(() => {});
    }
  }
}

module.exports = { handleModifyButton, handleModifyModalSubmit };
