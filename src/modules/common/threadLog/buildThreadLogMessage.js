// modules/common/threadLog/buildThreadLogMessage.js
function buildThreadLogMessage({
  functionName,
  storeName,

  applicantUser,
  appliedAt,

  editUser = null,
  editAt = null,

  approveUser = null,
  approveAt = null,

  status = 'pending', // pending | edit | approved | deleted
}) {
  return [
    `${functionName}申請・報告 - ${storeName}`,
    '',
    '【ステータス】',
    getStatusLabel(status),
    '',
    '【申請者・報告者】',
    applicantUser ? applicantUser.toString() : '-',
    '',
    '【申請・報告時間】',
    formatDate(appliedAt),
    '',
    '【修正者】',
    editUser ? editUser.toString() : '-',
    '',
    '【修正時間】',
    editAt ? formatDate(editAt) : '-',
    '',
    '【承認者】',
    approveUser ? approveUser.toString() : '-',
    '',
    '【承認時間】',
    approveAt ? formatDate(approveAt) : '-',
    '',
    '【店舗】',
    storeName,
    '',
    formatDate(new Date()),
  ].join('\n');
}

function getStatusLabel(status) {
  return {
    pending: '⏳ 未承認',
    edit: '✏️ 修正依頼',
    approved: '✅ 承認済み',
    deleted: '🗑 削除',
  }[status];
}

function formatDate(d) {
  if (!d) return '-';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = {
  buildThreadLogMessage,
};