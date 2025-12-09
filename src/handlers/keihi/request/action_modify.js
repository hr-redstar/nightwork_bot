// src/handlers/keihi/request/action_modify.js
// ----------------------------------------------------
// 経費申請「修正」ボタン & 修正モーダル処理
//   - 修正ボタン押下でモーダル表示（既存値を埋め込む）
//   - モーダル送信で Embed / ログ / JSON を更新
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
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { resolveStoreName } = require('../setting/panel');
const {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
} = require('./statusHelpers');
const { STATUS_IDS } = require('./statusIds');
const {
  loadKeihiDailyData,
  saveKeihiDailyData,
} = require('../../../utils/keihi/gcsKeihiManager');

/**
 * 修正ボタン押下 → モーダル表示
 */
async function handleModifyButton(interaction) {
  const { customId, guild, member } = interaction;
  const guildId = guild.id;

  // keihi_request_modify::{storeId}::{threadId}::{messageId}[::status]
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

  // 権限チェック（承認ロールを持つ人だけ修正可とする）
  const approverRoleIds = collectApproverRoleIds(keihiConfig);
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

  // 既存値をEmbedから取得
  const date = getEmbedFieldValue(baseEmbed, '日付') || '';
  const department = getEmbedFieldValue(baseEmbed, '部署') || '';
  const item = getEmbedFieldValue(baseEmbed, '経費項目') || '';
  const amountRaw = getEmbedFieldValue(baseEmbed, '金額') || '';
  const amount = amountRaw.replace(/[^\d]/g, '');
  const note = getEmbedFieldValue(baseEmbed, '備考') || '';

  // 修正用モーダルを表示
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
        .setValue(date),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('department')
        .setLabel('部署')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(department),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item')
        .setLabel('経費項目')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(item),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('金額（半角数字）')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(amount),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('note')
        .setLabel('備考')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(note),
    ),
  );

  await interaction.showModal(modal);
}

/**
 * 修正モーダル送信時
 */
async function handleModifyModalSubmit(interaction) {
  const customId = interaction.customId; // keihi_request_modify_modal::storeId::threadId::messageId
  const [, storeId, threadId, messageId] = customId.split('::');
  if (!storeId || !threadId || !messageId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
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
  const date = interaction.fields.getTextInputValue('date').trim();
  const department = (interaction.fields.getTextInputValue('department') || '').trim();
  const item = (interaction.fields.getTextInputValue('item') || '').trim();
  const amount = Number(
    (interaction.fields.getTextInputValue('amount') || '').replace(/[^\d]/g, ''),
  );
  const note = (interaction.fields.getTextInputValue('note') || '').trim();

  if (!date || !item || !Number.isFinite(amount) || amount <= 0) {
    await interaction.editReply({
      content: '日付・項目・金額を正しく入力してください。',
    });
    return;
  }

  const now = new Date();
  const tsUnix = Math.floor(now.getTime() / 1000);
  const modifiedAtText = `<t:${tsUnix}:f>`;
  const storeName = resolveStoreName(storeRoleConfig, storeId);

  // Embed 更新
  const fields = [
    { name: '日付', value: date, inline: true },
    { name: '部署', value: department || '未入力', inline: true },
    { name: '経費項目', value: item, inline: false },
    { name: '金額', value: `${amount.toLocaleString()} 円`, inline: true },
    { name: '備考', value: note || '未入力', inline: false },
    { name: 'ステータス', value: '📝 修正済み', inline: true },
    { name: '入力者', value: getEmbedFieldValue(baseEmbed, '入力者') || '不明', inline: true },
    { name: '入力時間', value: getEmbedFieldValue(baseEmbed, '入力時間') || '不明', inline: true },
    { name: '修正者', value: `${interaction.member}`, inline: true },
    { name: '修正時間', value: modifiedAtText, inline: true },
  ];

  const newEmbed = new EmbedBuilder()
    .setTitle('経費申請（修正済み）')
    .setFields(fields)
    .setFooter(baseEmbed.footer ?? null)
    .setColor(baseEmbed.color ?? null)
    .setTimestamp(now);

  await message.edit({ embeds: [newEmbed], components: message.components });

  // ログメッセージ更新
  const footerText = baseEmbed.footer?.text || '';
  const logMessageId = footerText.startsWith('LogID: ')
    ? footerText.slice('LogID: '.length)
    : null;
  const parentChannel = thread.parent ?? thread;
  if (parentChannel && logMessageId) {
    const logMessage = await parentChannel.messages.fetch(logMessageId).catch(() => null);
    if (logMessage) {
      let content = logMessage.content;
      if (/^修正者：/m.test(content)) {
        content = content.replace(
          /^修正者：.*$/m,
          `修正者：${interaction.member}　修正時間：${modifiedAtText}`,
        );
      } else {
        content = content.replace(
          /承認者：.*$/m,
          `修正者：${interaction.member}　修正時間：${modifiedAtText}\n$&`,
        );
      }
      await logMessage.edit({ content });
    }
  }

  // JSON 更新
  const dailyData = (await loadKeihiDailyData(guildId, storeId, date)) || {};
  if (!Array.isArray(dailyData.requests)) dailyData.requests = [];
  let record = dailyData.requests.find(r => r.id === messageId);
  if (!record) {
    record = {};
    dailyData.requests.push(record);
  }
  Object.assign(record, {
    id: messageId,
    申請ID: messageId,
    ログID: record.logId || null,
    status: '修正',
    date,
    department,
    item,
    amount,
    note,
    modifierId: interaction.member.id,
    modifier: `${interaction.member}`,
    modifierName: interaction.member.displayName || interaction.member.user?.username || `${interaction.member}`,
    修正者ID: interaction.member.id,
    modifierAtText: modifiedAtText,
    updatedAt: now.toISOString(),
  });
  dailyData.lastUpdated = now.toISOString();
  await saveKeihiDailyData(guildId, storeId, date, dailyData);

  await sendSettingLog(interaction, {
    title: '経費申請修正',
    description:
      `店舗「${storeName}」の経費申請を修正しました。\n` +
      `修正者：${interaction.member}　修正時間：${modifiedAtText}\n` +
      `日付：${date}　部署：${department || '未入力'}　経費項目：${item}\n` +
      `スレッドメッセージリンク：${message.url}`,
  });

  await interaction.editReply({ content: '経費申請を修正しました。' });
}

module.exports = { handleModifyButton, handleModifyModalSubmit };
