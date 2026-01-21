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
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(descriptionLines.join('\n'))
    .setColor(color)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('approval:accept')
      .setLabel('承認')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('approval:edit')
      .setLabel('修正')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('approval:delete')
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