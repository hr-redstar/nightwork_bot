// src/utils/keihi/keihiValidator.js
// ----------------------------------------------------
// 経費入力のバリデーション（最新版）
// ----------------------------------------------------

/**
 * 全角 → 半角変換
 */
function toHalfWidth(str) {
  return str.replace(/[！-～]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );
}

/**
 * 金額チェック
 * - 数字のみ
 * - カンマ削除
 * - 全角→半角
 * @returns {number|null} 正常なら数値, エラー時 null
 */
function validateAmount(amountText) {
  if (!amountText) return null;

  // 全角 → 半角
  let a = toHalfWidth(amountText);

  // カンマ除去
  a = a.replace(/,/g, '');

  // 数字チェック
  if (!/^\d+$/.test(a)) return null;

  const amount = Number(a);
  if (isNaN(amount) || amount <= 0) return null;

  return amount;
}

/**
 * 内容チェック（説明）
 * @returns {string|null}
 */
function validateDescription(text) {
  if (!text) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // 255文字制限など必要ならここに追加
  return trimmed;
}

/**
 * 店舗名チェック
 * @param {string} store
 * @param {string[]} validStoreList
 */
function validateStore(store, validStoreList) {
  if (!store || !Array.isArray(validStoreList)) return false;
  return validStoreList.includes(store);
}

/**
 * URLチェック（画像）
 */
function validateImageUrl(url) {
  if (!url) return true; // そもそも画像添付なし → OK

  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * フルバリデーション
 */
function validateKeihiInput({ amount, description, store, storeList, imageUrl }) {
  const validatedAmount = validateAmount(amount);
  if (validatedAmount === null) {
    return { ok: false, reason: '金額が不正です。数字のみ入力してください。' };
  }

  const validatedDesc = validateDescription(description);
  if (validatedDesc === null) {
    return { ok: false, reason: '内容の入力が不正です。空白のみは不可です。' };
  }

  if (!validateStore(store, storeList)) {
    return { ok: false, reason: '店舗の選択が不正です。' };
  }

  if (!validateImageUrl(imageUrl)) {
    return { ok: false, reason: '画像URLが不正です。' };
  }

  return {
    ok: true,
    amount: validatedAmount,
    description: validatedDesc,
    store,
    imageUrl: imageUrl || null,
  };
}

module.exports = {
  validateAmount,
  validateDescription,
  validateStore,
  validateImageUrl,
  validateKeihiInput,
};
