// src/handlers/uriage/report/ids.js
// 売上報告フロー用 customId 定義

const PREFIX = 'uriage:report';

const IDS = {
  PREFIX,
  BUTTON: {
    REPORT_OPEN: `${PREFIX}:btn:report_open`, // パネルの「売上報告」
    APPROVE: `${PREFIX}:btn:approve`,
    EDIT: `${PREFIX}:btn:edit`,
    DELETE: `${PREFIX}:btn:delete`,
  },
  MODAL: {
    REPORT: `${PREFIX}:submit:modal`, // `${MODAL.REPORT}::${storeName}`
  },
  FIELDS: {
    DATE: 'uriage_report_date', // Input IDs shouldn't change to avoid losing state if logic depends on them? Actually simple string matching. Safe to keep or change? Changing usually fine for ephemeral modals.
    TOTAL: 'uriage_report_total',
    CASH: 'uriage_report_genkin',
    CARD: 'uriage_report_card',
    CREDIT: 'uriage_report_kake',
    EXPENSE: 'uriage_report_expense',
  },
  SELECT: {
    VIEW_ROLES: `${PREFIX}:role:view_select`, // `${SELECT.VIEW_ROLES}:${storeId}`
    REQUEST_ROLES: `${PREFIX}:role:req_select`, // `${SELECT.REQUEST_ROLES}:${storeId}`
  },
};

module.exports = { IDS, PREFIX };
