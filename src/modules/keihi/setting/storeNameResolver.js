// src/handlers/keihi/setting/storeNameResolver.js
// ----------------------------------------------------
// 店舗名解決ロジック（設定パネル / 申請パネル / 承認 など共通）
//   - GCS/ギルドID/config/店舗_役職_ロール.json のフォーマット差異を吸収
// ----------------------------------------------------

/**
 * 店舗名解決
 * @param {any} storeRoleConfig GCS/..../店舗_役職_ロール.json の内容
 * @param {string} storeId      keihiConfig.panels のキーなど（店舗ID or 店舗名）
 * @returns {string} 解決された店舗名（失敗時は storeId をそのまま返す）
 */
function resolveStoreName(storeRoleConfig, storeId) {
  if (!storeRoleConfig) return storeId;

  // v2: { stores: [...] } or { stores: { id: { name, ... } } }
  // v1: 配列 or 連想オブジェクトなど
  const rawStores = storeRoleConfig.stores ?? storeRoleConfig;

  // --- 配列形式 ---
  if (Array.isArray(rawStores)) {
    // ① id 一致
    const storeById = rawStores.find(
      (s) => s && String(s.id) === String(storeId),
    );
    if (storeById) {
      return storeById.name ?? storeById.storeName ?? storeId;
    }

    // ② インデックス一致（昔の "0: 店長のお店" みたいなケース）
    const storeByIndex = rawStores[Number(storeId)];
    if (typeof storeByIndex === 'string') return storeByIndex;
    return (
      storeByIndex?.name ??
      storeByIndex?.storeName ??
      storeId
    );
  }

  // --- 連想オブジェクト形式 ---
  if (rawStores && typeof rawStores === 'object') {
    const entry = rawStores[storeId];
    if (entry && typeof entry === 'object') {
      return entry.name ?? entry.storeName ?? storeId;
    }
  }

  return storeId;
}

module.exports = {
  resolveStoreName,
};