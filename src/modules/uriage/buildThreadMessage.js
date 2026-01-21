// modules/common/threadMessage/buildThreadMessage.js
function buildThreadMessage({
  functionName,   // '売上' '経費' 'KPI'
  storeName,

  status,         // pending | edit | approved | deleted

  applicantUser,
  appliedAt,

  editUser = null,
  editAt = null,

  approveUser = null,
  approveAt = null,

  extraFields = [], // 機能別項目
}) {
  return [
    `${functionName} 申請・報告 - ${storeName}`,
    '',
    'ステータス',
    statusLabel(status),
    '',
    '――――――――――――――',
    '申請者・報告者',
    applicantUser.toString(),
    '申請・報告時間',
    fmt(appliedAt),
    '',
    '修正者',
    user(editUser),
    '修正時間',
    fmt(editAt),
    '',
    '承認者',
    user(approveUser),
    '承認時間',
    fmt(approveAt),
    '',
    '店舗',
    storeName,
    ...extraBlock(extraFields),
    '――――――――――――――',
  ].filter(Boolean).join('\n');
}

function statusLabel(status) {
  return {
    pending: '⏳ 承認待ち',
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

function extraBlock(fields) {
  if (!fields.length) return [];
  return [
    '',
    '――――――――――――――',
    ...fields.flatMap(f => [f.label, String(f.value), '']),
  ];
}

module.exports = { buildThreadMessage };