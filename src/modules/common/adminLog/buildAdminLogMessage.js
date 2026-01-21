// modules/common/adminLog/buildAdminLogMessage.js
function buildAdminLogMessage({
  functionName,   // '売上' '経費' 'KPI'
  storeName,
  dateLabel,      // '2026-01-01'
  threadName,
  threadUrl,

  actorUser,
  actedAt,

  actionType,     // 'apply' | 'edit' | 'approve' | 'delete'
}) {
  return [
    `${functionName} 申請・報告`,
    '----------------------------------',
    `店舗「${storeName}」`,
    '',
    `${dateLabel} の申請・報告がされました。`,
    '',
    'スレッド：',
    threadName,
    threadUrl,
    '',
    `実行者：${actorUser.toString()}`,
    `実行時間：${fmt(actedAt)}`,
    `ステータス：${actionLabel(actionType)}`,
    '----------------------------------',
  ].join('\n');
}

function actionLabel(type) {
  return {
    apply: '申請',
    edit: '修正',
    approve: '承認',
    delete: '削除',
  }[type] || type;
}

function fmt(d) {
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

module.exports = { buildAdminLogMessage };