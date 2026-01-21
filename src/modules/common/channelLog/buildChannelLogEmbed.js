// modules/common/channelLog/buildChannelLogEmbed.js
const { EmbedBuilder } = require('discord.js');
const { getBotFooter } = require('../utils/embed/getBotFooter');

function buildChannelLogEmbed({
  functionName,
  targetDate,
  threadName,
  threadUrl,

  inputUser,
  inputAt,

  editUser = null,
  editAt = null,

  approveUser = null,
  approveAt = null,

  status = 'pending', // pending | edit | approved | deleted
  channel,
}) {
  const lines = [
    `${targetDate} の${functionName}報告がされました。`,
    '',
    formatLine('入力者', inputUser, inputAt),
    formatLine('修正者', editUser, editAt),
    formatLine('承認者', approveUser, approveAt),
    '',
    `状態：${getStatusLabel(status)}`,
    `${threadName}`,
  ];

  return new EmbedBuilder()
    .setDescription(lines.join('\n'))
    .setColor(getStatusColor(status))
    .setFooter(getBotFooter(channel))
    .setTimestamp();
}

function formatLine(label, user, date) {
  if (!user || !date) {
    return `${label}：-　${label}時間：-`;
  }
  return `${label}：${user}　${label}時間：${formatDate(date)}`;
}

function getStatusLabel(status) {
  return {
    pending: '🟡 未承認',
    edit: '🔵 修正依頼',
    approved: '🟢 承認済',
    deleted: '🔴 削除',
  }[status];
}

function getStatusColor(status) {
  return {
    pending: 0xfaa61a,
    edit: 0x5865f2,
    approved: 0x57f287,
    deleted: 0xed4245,
  }[status];
}

function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = {
  buildChannelLogEmbed,
};