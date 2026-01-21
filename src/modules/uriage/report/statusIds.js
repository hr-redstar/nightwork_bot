// src/handlers/uriage/report/statusIds.js
// 売上報告ステータス更新用 ID（承認/修正/削除）

const PREFIX = 'uriage:report:status';

const STATUS_IDS = {
  APPROVE: `${PREFIX}:approve`,
  MODIFY: `${PREFIX}:modify`,
  DELETE: `${PREFIX}:delete`,
};

module.exports = { STATUS_IDS, PREFIX };
