﻿﻿﻿const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { loadUriageConfig, saveDailyReport } = require('../utils/uriage/uriageDataManager');
const { getGuildConfig } = require('../utils/config/gcsConfigManager'); // Keep for now for role access
const { sendUriageLog } = require('./uriage/uriageLogger');

/**
 * 売上報告モーダル送信処理
 */
async function handleUriageModalSubmit(interaction) {
  const [_, __, ___, storeName] = interaction.customId.split('_');
  const user = interaction.user;
  const guild = interaction.guild;

  // 入力値
  const date = interaction.fields.getTextInputValue('date');
  const total = Number(interaction.fields.getTextInputValue('total'));
  const cash = Number(interaction.fields.getTextInputValue('cash'));
  const card = Number(interaction.fields.getTextInputValue('card'));
  const expense = Number(interaction.fields.getTextInputValue('expense'));
  const remain = total - (card + expense);

  const uriageConfig = await loadUriageConfig(guild.id);
  const targetChannelId = uriageConfig?.storeChannels?.[storeName];
  if (!targetChannelId) {
    return interaction.reply({
      content: `⚠️ ${storeName} の売上報告チャンネルが設定されていません。`,
      ephemeral: true,
    });
  }

  const targetChannel = guild.channels.cache.get(targetChannelId);
  if (!targetChannel)
    return interaction.reply({ content: '⚠️ チャンネルが見つかりません。', ephemeral: true });

  // 売上報告スレッド名
  const ym = date.slice(0, 7); // YYYY-MM
  const threadName = `${ym}_${storeName}_売上報告`;

  // 既存スレッドを検索 or 新規作成
  let thread = targetChannel.threads.cache.find((t) => t.name === threadName);
  if (!thread) {
    thread = await targetChannel.threads.create({
      name: threadName,
      autoArchiveDuration: 10080, // 7日
      reason: '売上報告スレッド自動生成',
    });
  }

  // 権限制御（承認・閲覧ロールのみ表示可）
  // TODO: uriageConfigから取得するように統一する
  const config = await getGuildConfig(guild.id); // For roles
  const approvalRoles = uriageConfig.approvalRoles || [];
  const viewRoles = uriageConfig.viewRoles || [];

  for (const role of guild.roles.cache.values()) {
    await thread.permissionOverwrites.edit(role.id, {
      ViewChannel: false,
    });
  }

  for (const roleId of [...approvalRoles, ...viewRoles]) {
    await thread.permissionOverwrites.edit(roleId, {
      ViewChannel: true,
      SendMessages: true,
    });
  }

  await thread.permissionOverwrites.edit(user.id, { ViewChannel: true });

  // Embed内容
  const embed = new EmbedBuilder()
    .setTitle(`📄 売上報告（${date}）`)
    .addFields(
      { name: '店舗', value: storeName, inline: true },
      { name: '入力者', value: `<@${user.id}>`, inline: true },
      { name: '入力時間', value: new Date().toLocaleString('ja-JP'), inline: false },
      { name: '総売り', value: `${total.toLocaleString()}円`, inline: true },
      { name: '現金', value: `${cash.toLocaleString()}円`, inline: true },
      { name: 'カード', value: `${card.toLocaleString()}円`, inline: true },
      { name: '諸経費', value: `${expense.toLocaleString()}円`, inline: true },
      { name: '残金', value: `${remain.toLocaleString()}円`, inline: true }
    )
    .setColor(0xf1c40f)
    .setFooter({ text: '承認または修正を行ってください。' });

  // ボタン
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uriage_approve_${storeName}_${user.id}_${date}`)
      .setLabel('✅ 承認')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`uriage_edit_${storeName}_${user.id}_${date}`)
      .setLabel('✏️ 修正')
      .setStyle(ButtonStyle.Secondary)
  );

  // スレッドに送信
  const message = await thread.send({ embeds: [embed], components: [row] });

  // メインチャンネルに報告通知
  await targetChannel.send({
    content: `🧾 ${date} の売上報告がされました。\n入力者：<@${user.id}>  \n→ [スレッドを確認する](${message.url})`,
  });

  // データ保存
  const reportData = {
    user: user.id,
    date,
    storeName,
    total,
    cash,
    card,
    expense,
    remain,
    createdAt: new Date().toISOString(),
    status: 'pending', // 承認待ち
  };
  await saveDailyReport(guild.id, storeName, date, reportData);

  await sendUriageLog(guild, {
    store: storeName,
    user,
    amount: total,
    memo: `現金:${cash}, カード:${card}, 経費:${expense}`,
  });

  await interaction.reply({
    content: `✅ ${storeName} の売上報告を記録しました。`,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 承認ボタン処理
 */
async function handleUriageApprove(interaction) {
  const [_, __, storeName, targetUserId, date] = interaction.customId.split('_');
  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const config = await getGuildConfig(guild.id);
  const approvalRoles = config.uriageApprovalRoles || [];

  // 承認ロール持ちのみ押下可能
  if (!member.roles.cache.some((r) => approvalRoles.includes(r.id))) {
    return interaction.reply({ content: '🚫 承認権限がありません。', flags: MessageFlags.Ephemeral });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.addFields({ name: '承認者', value: `<@${interaction.user.id}>`, inline: true });

  await interaction.update({
    embeds: [embed],
    components: [],
  });

  // CSV出力トリガー
  const yyyy = date.split('-')[0];
  const mm = date.split('-')[1];
  const filePath = `GCS/${guild.id}/uriage/${storeName}/売上報告_${date}.csv`;

  const csvLine = `${date},${storeName},${targetUserId},${interaction.user.id},承認済み\n`;
  await writeFileToGCS(filePath, csvLine);

  await interaction.followUp({
    content: `✅ 承認しました。\nCSV: ${filePath}`,
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 修正ボタン処理
 */
async function handleUriageEdit(interaction) {
  const [_, __, storeName, targetUserId, date] = interaction.customId.split('_');
  const user = interaction.user;
  const config = await getGuildConfig(interaction.guild.id);

  const approvalRoles = config.uriageApprovalRoles || [];
  const isApprover = interaction.member.roles.cache.some((r) =>
    approvalRoles.includes(r.id)
  );

  if (user.id !== targetUserId && !isApprover) {
    return interaction.reply({
      content: '🚫 修正権限がありません。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.addFields({
    name: '修正情報',
    value: `修正日：${new Date().toLocaleString('ja-JP')}\n修正者：<@${user.id}>`,
  });

  await interaction.update({
    embeds: [embed],
  });

  await interaction.followUp({
    content: `✏️ 修正情報を更新しました。`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleUriageModalSubmit,
  handleUriageApprove,
  handleUriageEdit,
};
