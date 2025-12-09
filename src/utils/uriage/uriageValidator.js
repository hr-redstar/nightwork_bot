// src/utils/uriage/uriageValidator.js
// 売上報告用の簡易バリデーション

function validateReportInput(fields) {
  const errors = [];
  if (!fields.date) errors.push('日付は必須です。');
  if (!fields.total || Number(fields.total) <= 0) errors.push('総売りは1以上を入力してください。');
  return errors;
}

module.exports = { validateReportInput };
