// src/handlers/uriage/report/requestFlow.js
// 売上報告フロー（モーダル表示〜スレッド作成）

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { loadUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { loadUriageStoreConfig } = require('../../../utils/uriage/gcsUriageManager');
const { hasAnyRole } = require('../../../utils/uriage/uriageValidator');
const logger = require('../../../utils/logger');
const { sendAdminLog } = require('../../../utils/uriage/embedLogger');
const { buildReportActionRow } = require('./statusActions');
const { IDS } = require('./ids');

function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

async function openUriageReportModal(interaction) {
  const storeId = interaction.customId.split(':')[3];
  if (!storeId) {
    return interaction.reply({ content: '⚠️ 店舗IDを特定できませんでした。', flags: MessageFlags.Ephemeral });
  }

  const guildId = interaction.guild.id;
  const [globalConfig, storeConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadUriageStoreConfig(guildId, storeId),
  ]);

  const allowedRoleIds = [
    ...(globalConfig.approverRoleIds || []),
    ...(storeConfig.requestRoleIds || []),
  ];

  if (!hasAnyRole(interaction.member, allowedRoleIds)) {
    return interaction.reply({ content: '⚠️ この店舗で売上を報告する権限がありません。', flags: MessageFlags.Ephemeral });
  }

  const modal = new ModalBuilder()
    .setCustomId(`${IDS.MODAL_REPORT}:${storeId}`)
    .setTitle('💰 売上報告');

  const rows = [
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('date').setLabel('日付（例：2025/11/13）').setStyle(TextInputStyle.Short).setValue(getToday()).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('total').setLabel('総売り（円）').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cash').setLabel('現金（円）').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('card').setLabel('カード（円）').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cost').setLabel('諸経費（円）').setStyle(TextInputStyle.Short).setRequired(true)),
  ];

  modal.addComponents(rows);
  await interaction.showModal(modal);
}

function parseReportInputs(interaction) {
  const inputs = {
    date: interaction.fields.getTextInputValue('date'),
    total: parseInt(interaction.fields.getTextInputValue('total') || 0, 10),
    cash: parseInt(interaction.fields.getTextInputValue('cash') || 0, 10),
    card: parseInt(interaction.fields.getTextInputValue('card') || 0, 10),
    cost: parseInt(interaction.fields.getTextInputValue('cost') || 0, 10),
  };
  inputs.remain = inputs.total - (inputs.card + inputs.cost);
  return inputs;
}

async function findOrCreateReportThread(parentChannel, storeName, date) {
  const ym = (date || '').slice(0, 7).replace('/', '');
  const threadName = `${ym}-${storeName}-売上報告`;

  let thread = parentChannel.threads.cache.find((t) => t.name === threadName && !t.archived);
  if (thread) return thread;

  try {
    const archivedThreads = await parentChannel.threads.fetchArchived();
    thread = archivedThreads.threads.find((t) => t.name === threadName);
    if (thread) {
      await thread.setArchived(false);
      return thread;
    }
  } catch (err) { // スレッドが見つからない場合もここに来る
    logger.warn(`[uriage/requestFlow] アーカイブ済みスレッドの取得に失敗、または見つかりませんでした: ${err.message}`);
  }

  return parentChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 4320, // 3日
    reason: '売上報告スレッド作成',
  });
}

async function applyThreadPermissions(thread, globalConfig, storeConfig) {
  try {
    const everyone = thread.guild.roles.everyone;
    await thread.permissionOverwrites.edit(everyone, { ViewChannel: false });

    const allowed = new Set([
      ...(globalConfig.approverRoleIds || []),
      ...(storeConfig.viewRoleIds || []),
      ...(storeConfig.requestRoleIds || []),
    ]);

    for (const roleId of allowed) {
      if (roleId) await thread.permissionOverwrites.edit(roleId, { ViewChannel: true });
    }
  } catch (err) {
    console.error('⚠️ スレッド権限設定エラー:', err);
  }
}

function buildReportEmbed(inputs, storeName, member, inputTime) {
  return new EmbedBuilder()
    .setTitle(`📊 ${storeName} 売上報告`)
    .addFields(
      { name: '日付', value: inputs.date, inline: true },
      { name: '総売り', value: `${inputs.total.toLocaleString()}円`, inline: true },
      { name: '現金', value: `${inputs.cash.toLocaleString()}円`, inline: true },
      { name: 'カード', value: `${inputs.card.toLocaleString()}円`, inline: true },
      { name: '諸経費', value: `${inputs.cost.toLocaleString()}円`, inline: true },
      { name: '残金', value: `${inputs.remain.toLocaleString()}円`, inline: true },
      { name: '入力者', value: `<@${member.id}>`, inline: true },
      { name: '入力時間', value: inputTime.toLocaleString('ja-JP'), inline: true }
    )
    .setColor(0x00bfa5)
    .setTimestamp();
}

async function handleReportSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const member = interaction.member;
  const parentChannel = interaction.channel;
  const storeId = interaction.customId.split(':')[3];

  const inputs = parseReportInputs(interaction);

  const [globalConfig, storeConfig] = await Promise.all([
    loadUriageConfig(guildId),
    loadUriageStoreConfig(guildId, storeId),
  ]);
  const storeName = storeConfig.name || storeId;

  const thread = await findOrCreateReportThread(parentChannel, storeName, inputs.date);
  await applyThreadPermissions(thread, globalConfig, storeConfig);

  const inputTime = new Date();
  const embed = buildReportEmbed(inputs, storeName, member, inputTime);
  const row = buildReportActionRow();

  const reportMsg = await thread.send({ embeds: [embed], components: [row] });

  await parentChannel.send({
    content: `📢 **${storeName}** の売上報告がされました。\n日付：${inputs.date}\n入力者：<@${member.id}>\n入力時間：${reportMsg.createdAt.toLocaleString('ja-JP')}\n承認者：未承認\nスレッド：${reportMsg.url}`,
  });

  await sendAdminLog(interaction, {
    title: '📝 売上報告',
    fields: [
      { name: '店舗', value: storeName, inline: true },
      { name: '日付', value: inputs.date, inline: true },
      { name: '入力者', value: `<@${member.id}>`, inline: true },
      { name: 'スレッド', value: reportMsg.url, inline: false },
    ],
  });

  await interaction.editReply({ content: `✅ 売上報告を登録しました。` });
}

module.exports = {
  openUriageReportModal,
  handleReportSubmit,
};