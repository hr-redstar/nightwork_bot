// modules/common/channelLog/buildChannelLogMessage.js
function buildChannelLogMessage({
  functionName,
  storeName,
  dateLabel, // '2026-01-01'
  threadName,
  threadUrl,

  applicantUser,
  appliedAt,

  editUser = null,
  editAt = null,

  approveUser = null,
  approveAt = null,

  status = 'pending', // pending | edit | approved | deleted
}) {
  return [
    '----------------------------',
    `${dateLabel} の${functionName}報告がされました。`,
    '',
    `入力者：${user(applicantUser)}　入力時間：${fmt(appliedAt)}`,
    `修正者：${user(editUser)}　修正時間：${fmt(editAt)}`,
    `承認者：${user(approveUser)}　承認時間：${fmt(approveAt)}`,
    '',
    `${threadName}`,
    statusLine(status),
    threadUrl,
    '----------------------------',
  ].filter(Boolean).join('\n');
}

function statusLine(status) {
  return {
    pending: '',
    edit: '✏️ 修正依頼中',
    approved: '✅ 承認済み',
    deleted: '🗑 削除',
  }[status];
}

function user(u) {
  return u ? u.toString() : '-';
}

function fmt(d) {
  if (!d) return '-';
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = { buildChannelLogMessage };