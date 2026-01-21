// src/modules/common/approval/sendApprovalPanel.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

async function sendApprovalPanel({
  channel,
  mentionRoleId,
  title,
  descriptionLines,
  color = 0xffa500,
  payload, // ← 機能固有データ
  idPrefix = 'approval', // ← 追加: カスタムIDプレフィックス
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(descriptionLines.join('\n'))
    .setColor(color)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${idPrefix}:accept`)
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`${idPrefix}:edit`)
      .setLabel('修正')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`${idPrefix}:delete`)
      .setLabel('削除')
      .setStyle(ButtonStyle.Danger)
  );

  return await channel.send({
    content: mentionRoleId ? `<@&${mentionRoleId}>` : null,
    embeds: [embed],
    components: [row],
  });
}

module.exports = {
  sendApprovalPanel,
};