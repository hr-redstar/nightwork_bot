// src/utils/keihi/keihiValidator.js
// ----------------------------------------------------
// 経費機能 向けバリデーション & 権限チェック
// ----------------------------------------------------

/**
 * メンバーが指定ロールを1つでも持っているか
 * @param {import('discord.js').GuildMember} member
 * @param {string[]} roleIds
 */
function hasAnyRole(member, roleIds = []) {
  if (!member || !Array.isArray(roleIds) || roleIds.length === 0) return false;
  return member.roles.cache.some((r) => roleIds.includes(r.id));
}

/**
 * 経費申請ボタンを押せるかどうか
 *   - 店舗ロール（storeRoleIds）※必要であれば
 *   - 閲覧役職(viewRoleIds)
 *   - 申請役職(requestRoleIds)
 *   - 全体承認役職(approverRoleIds)
 *
 * @param {import('discord.js').GuildMember} member
 * @param {{ viewRoleIds?: string[], requestRoleIds?: string[] }} panelConfig
 * @param {{ approverRoleIds?: string[] }} globalConfig
 * @param {string[]} [storeRoleIds]
 */
function canUseKeihiRequestButton(member, panelConfig = {}, globalConfig = {}, storeRoleIds = []) {
  const { viewRoleIds = [], requestRoleIds = [] } = panelConfig;
  const { approverRoleIds = [] } = globalConfig;

  // 許可されている全てのロールIDを1つの配列にまとめる
  const allowedRoleIds = [
    ...storeRoleIds,
    ...viewRoleIds,
    ...requestRoleIds,
    ...approverRoleIds,
  ];
  return hasAnyRole(member, allowedRoleIds);
}

/**
 * YYYY-MM-DD のざっくりチェック
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/**
 * 金額文字列 → 数値（int）
 * 3,000 → 3000 など
 */
function parseAmount(amountStr) {
  if (typeof amountStr !== 'string' && typeof amountStr !== 'number') return NaN;
  const s = String(amountStr).replace(/,/g, '').trim();
  if (!s) return NaN;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

/**
 * 経費申請フォームのバリデーション
 * @param {{ date?: string, department?: string, item?: string, amount?: string|number, note?: string }} form
 * @returns {{ ok: boolean, errors: string[], normalized: object }}
 */
function validateKeihiForm(form = {}) {
  const errors = [];

  const date = (form.date || '').trim();
  if (!date) {
    errors.push('日付は必須です。');
  } else if (!isValidDateString(date)) {
    errors.push('日付は YYYY-MM-DD 形式で入力してください。');
  }

  const amountNum = parseAmount(form.amount);
  if (!form.amount && form.amount !== 0) {
    errors.push('金額は必須です。');
  } else if (Number.isNaN(amountNum) || amountNum <= 0) {
    errors.push('金額は1以上の数値で入力してください。');
  }

  const department = (form.department || '').trim();
  if (!department) {
    errors.push('部署を入力してください。');
  }

  const item = (form.item || '').trim();
  if (!item) {
    errors.push('経費項目を選択してください。');
  }

  const note = (form.note || '').trim();

  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      date,
      department,
      item,
      amount: amountNum,
      note,
    },
  };
}

module.exports = {
  hasAnyRole,
  canUseKeihiRequestButton,
  isValidDateString,
  parseAmount,
  validateKeihiForm,
};
