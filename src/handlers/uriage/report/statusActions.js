// src/handlers/uriage/report/statusActions.js
// 売上報告スレッド内のボタン（承認・修正・削除）処理

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const { loadUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { loadUriageStoreConfig } = require('../../../utils/uriage/gcsUriageManager');
const { hasAnyRole } = require('../../../utils/uriage/uriageValidator');
const { sendAdminLog, sendSettingLog } = require('../../../utils/uriage/embedLogger');
const { saveUriageCsv, parseEmbedToCsvData } = require('../../../utils/uriage/uriageCsvManager');
const { IDS } = require('./ids');

function buildReportActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(IDS.BTN_APPROVE).setLabel('承認').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(IDS.BTN_FIX).setLabel('修正').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(IDS.BTN_DELETE).setLabel('削除').setStyle(ButtonStyle.Danger)
  );
}

async function handleApprove(interaction) {
  const guildId = interaction.guild.id;
  const member = interaction.member;
  const config = await loadUriageConfig(guildId);

  if (!hasAnyRole(member, config.approverRoleIds)) {
    return interaction.reply({ content: '⚠️ 承認権限がありません。', flags: MessageFlags.Ephemeral });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.addFields(
    { name: '承認者', value: `<@${member.id}>`, inline: true },
    { name: '承認日', value: new Date().toLocaleDateString('ja-JP'), inline: true }
  );

  await interaction.update({ embeds: [embed], components: [] });

  // CSV保存
  const data = parseEmbedToCsvData(embed, member.id);
  const title = embed.data?.title || '';
  const m = title.match(/📊\s*(.+?)\s*売上報告/);
  const storeName = m?.[1] || '店舗不明';
  const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
  const dateForCsv = date.replace(/\//g, '-'); // YYYY/MM/DD -> YYYY-MM-DD
  await saveUriageCsv(guildId, storeName, dateForCsv, data, 'ok');

  // 親チャンネルへの通知
  const thread = interaction.channel;
  if (thread.isThread() && thread.parent) {
    const title = embed.data?.title || '';
    const m = title.match(/📊\s*(.+?)\s*売上報告/);
    const storeName = m?.[1] || '店舗不明';
    const date = embed.data.fields.find(f => f.name === '日付')?.value || '日付不明';

    const msgs = await thread.parent.messages.fetch({ limit: 50 });
    const target = msgs.find(m => m.content?.includes(interaction.message.url));
    if (target) {
      let newContent = target.content.replace(/承認者：.*(?=\n|$)/, `承認者：<@${member.id}>`);
      await target.edit({ content: newContent });
    } else {
      await thread.parent.send(`✅ **${storeName}** の売上報告が承認されました。\n日付：${date}\n承認者：<@${member.id}>\nスレッドメッセージ：${interaction.message.url}`);
    }
  }
}

async function handleDelete(interaction) {
  const guildId = interaction.guild.id;
  const member = interaction.member;
  const config = await loadUriageConfig(guildId);

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const inputUserField = embed.data.fields?.find((f) => f.name === '入力者')?.value || '';
  const isInputUser = inputUserField.includes(member.id);
  const isApprover = hasAnyRole(member, config.approverRoleIds);
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  if (!isInputUser && !isApprover && !isAdmin) {
    return interaction.reply({ content: '⚠️ 削除権限がありません。', flags: MessageFlags.Ephemeral });
  }

  embed.setTitle((embed.data.title || '') + ' (削除済み)');
  embed.setColor(0x808080);
  embed.addFields(
    { name: '削除者', value: `<@${member.id}>`, inline: true },
    { name: '削除日', value: new Date().toLocaleDateString('ja-JP'), inline: true }
  );

  await interaction.update({ embeds: [embed], components: [] });

  await sendAdminLog(interaction, {
    title: '🗑️ 売上報告削除',
    fields: [
      { name: '操作者', value: `<@${member.id}>`, inline: true },
      { name: 'メッセージ', value: interaction.message.url, inline: false },
    ],
  });

  // CSVへの削除記録
  const data = parseEmbedToCsvData(embed, member.id);
  const title = embed.data?.title || '';
  const m = title.match(/📊\s*(.+?)\s*売上報告/);
  const storeName = m?.[1] || '店舗不明';
  const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
  const dateForCsv = date.replace(/\//g, '-'); // YYYY/MM/DD -> YYYY-MM-DD
  // 削除の場合は金額を0にする
  data.total = data.cash = data.card = data.cost = data.remain = 0;
  await saveUriageCsv(guildId, storeName, dateForCsv, data, 'deleted');
}

async function handleReportFixSubmit(interaction, opts = {}) {
  const member = interaction.member;
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const inputUser = embed.data.fields.find((f) => f.name === '入力者')?.value;

  const canEdit = inputUser?.includes(member.id) || member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  if (!canEdit) {
    return interaction.reply({ content: '⚠️ 修正権限がありません。', flags: MessageFlags.Ephemeral });
  }

  // モーダルを開くだけ
  if (opts.openOnly) {
    const modal = new ModalBuilder()
      .setCustomId(`${IDS.MODAL_FIX}:${interaction.message.id}`) // uriage:report:modal:fix:messageId
      .setTitle('✏️ 売上報告修正');

    const currentEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
    const currentData = parseEmbedToCsvData(currentEmbed, null); // 承認者は不要

    const inputs = [
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('total').setLabel('総売り（円）').setStyle(TextInputStyle.Short).setValue(String(currentData.total)).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cash').setLabel('現金（円）').setStyle(TextInputStyle.Short).setValue(String(currentData.cash)).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('card').setLabel('カード（円）').setStyle(TextInputStyle.Short).setValue(String(currentData.card)).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cost').setLabel('諸経費（円）').setStyle(TextInputStyle.Short).setValue(String(currentData.cost)).setRequired(true)),
    ];

    modal.addComponents(inputs);
    return interaction.showModal(modal);
  }

  // モーダル送信時の処理
  await interaction.deferUpdate();

  const total = parseInt(interaction.fields.getTextInputValue('total') || 0, 10);
  const cash = parseInt(interaction.fields.getTextInputValue('cash') || 0, 10);
  const card = parseInt(interaction.fields.getTextInputValue('card') || 0, 10);
  const cost = parseInt(interaction.fields.getTextInputValue('cost') || 0, 10);
  const remain = total - (card + cost);

  embed.addFields(
    { name: '修正日', value: new Date().toLocaleDateString('ja-JP'), inline: true },
    { name: '修正者', value: `<@${member.id}>`, inline: true },
    { name: '総売り(修正後)', value: `${total.toLocaleString()}円`, inline: true },
    { name: '現金(修正後)', value: `${cash.toLocaleString()}円`, inline: true },
    { name: 'カード(修正後)', value: `${card.toLocaleString()}円`, inline: true },
    { name: '諸経費(修正後)', value: `${cost.toLocaleString()}円`, inline: true },
    { name: '残金(再計算)', value: `${remain.toLocaleString()}円`, inline: true }
  );

  const messageId = interaction.customId.split(':')[3]; // uriage:report:modal:fix:messageId から messageId を取得
  const targetMessage = await interaction.channel.messages.fetch(messageId);
  await targetMessage.edit({ embeds: [embed] });

  await interaction.editReply({ content: '✅ 報告を修正しました。', components: [] });

  // CSVへの修正記録
  const guildId = interaction.guild.id;
  const data = parseEmbedToCsvData(embed, member.id); // 修正者は承認者として記録
  const title = embed.data?.title || '';
  const m = title.match(/📊\s*(.+?)\s*売上報告/);
  const storeName = m?.[1] || '店舗不明';
  const date = embed.data?.fields?.find(f => f.name === '日付')?.value || '';
  const dateForCsv = date.replace(/\//g, '-'); // YYYY/MM/DD -> YYYY-MM-DD
  await saveUriageCsv(guildId, storeName, dateForCsv, data, 'edited');
}

module.exports = {
  buildReportActionRow,
  handleApprove,
  handleDelete,
  handleReportFixSubmit,
};
    );

    modal.addComponents(inputs);
    return interaction.showModal(modal);
  }

  // モーダル送信時の処理
  await interaction.deferUpdate();

  const total = parseInt(interaction.fields.getTextInputValue('total') || 0, 10);
  const cash = parseInt(interaction.fields.getTextInputValue('cash') || 0, 10);
  const card = parseInt(interaction.fields.getTextInputValue('card') || 0, 10);
  const cost = parseInt(interaction.fields.getTextInputValue('cost') || 0, 10);
  const remain = total - (card + cost);

  embed.addFields(
    { name: '修正日', value: new Date().toLocaleDateString('ja-JP'), inline: true },
    { name: '修正者', value: `<@${member.id}>`, inline: true },
    { name: '総売り(修正後)', value: `${total.toLocaleString()}円`, inline: true },
    { name: '現金(修正後)', value: `${cash.toLocaleString()}円`, inline: true },
    { name: 'カード(修正後)', value: `${card.toLocaleString()}円`, inline: true },
    { name: '諸経費(修正後)', value: `${cost.toLocaleString()}円`, inline: true },
    { name: '残金(再計算)', value: `${remain.toLocaleString()}円`, inline: true }
  );

  const messageId = interaction.customId.split(':')[3];
  const targetMessage = await interaction.channel.messages.fetch(messageId);
  await targetMessage.edit({ embeds: [embed] });

  await interaction.editReply({ content: '✅ 報告を修正しました。', components: [] });

  // CSVへの修正記録 (未実装)
}

module.exports = {
  buildReportActionRow,
  handleApprove,
  handleDelete,
  handleReportFixSubmit,
};