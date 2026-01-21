// modules/common/adminLog/buildAdminLogEmbed.js
const { EmbedBuilder } = require('discord.js');
const { ACTION_LABEL } = require('./constants');
const { getBotFooter } = require('../utils/embed/getBotFooter');

function buildAdminLogEmbed({
  functionName,     // KPI / 経費 / 売上
  action,           // apply | report | approve | edit | delete
  storeName,      // 店舗名
  targetDate,     // 2026-01-01
  threadUrl,        // スレッドリンク（任意）
  executor,       // interaction.user
  channel,        // interaction.channel
  note,             // 修正理由・補足（任意）
}) {
  const lines = [
    `店舗「${storeName}」`,
    '',
    `${targetDate} の${ACTION_LABEL[action]}がされました。`,
  ];

  if (threadUrl) {
    lines.push('', 'スレッドメッセージリンク：', threadUrl);
  }

  if (note) {
    lines.push('', '内容：', note);
  }

  lines.push(
    '',
    '実行者：',
    `・${executor.tag}　${formatNow()}`
  );

  return new EmbedBuilder()
    .setTitle(`${functionName} ${ACTION_LABEL[action]}`)
    .setDescription(lines.join('\n'))
    .setColor(getColorByAction(action))
    .setFooter(getBotFooter(channel))
    .setTimestamp();
}

// action別カラー（視認性UP）
function getColorByAction(action) {
  switch (action) {
    case 'approve': return 0x57f287; // green
    case 'edit':    return 0x5865f2; // blurple
    case 'delete':  return 0xed4245; // red
    default:        return 0xfaa61a; // apply/report
  }
}

function formatNow() {
  const d = new Date();
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = {
  buildAdminLogEmbed,
};