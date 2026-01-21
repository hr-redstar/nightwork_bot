// src/handlers/uriage/report/ids.js
// 売上報告フロー用 customId 定義

const PREFIX = 'uriage_report';

const IDS = {
  PREFIX,
  BUTTON: {
    REPORT_OPEN: `${PREFIX}:btn:report`, // パネルの「売上報告」
    APPROVE: `${PREFIX}:btn:approve`,
    EDIT: `${PREFIX}:btn:edit`,
    DELETE: `${PREFIX}:btn:delete`,
  },
  MODAL: {
    REPORT: `${PREFIX}:modal`, // `${MODAL.REPORT}::${storeName}`
  },
  FIELDS: {
    DATE: 'uriage_report_date',
    TOTAL: 'uriage_report_total',
    CASH: 'uriage_report_genkin',
    CARD: 'uriage_report_card',
    CREDIT: 'uriage_report_kake',
    EXPENSE: 'uriage_report_expense',
  },
  SELECT: {
    VIEW_ROLES: `${PREFIX}:sel:view_roles`, // `${SELECT.VIEW_ROLES}:${storeId}`
    REQUEST_ROLES: `${PREFIX}:sel:request_roles`, // `${SELECT.REQUEST_ROLES}:${storeId}`
  },
};

module.exports = { IDS, PREFIX };
