// src/utils/feature/featureIdsTemplate.js
// ----------------------------------------------------
// 汎用 機能テンプレート用 customId 生成ヘルパー
// ----------------------------------------------------

/**
 * @typedef {Object} FeatureIds
 * @property {string} FEATURE_KEY          - 機能キー (例: 'keihi', 'uriage')
 * @property {string} FEATURE_LABEL        - 日本語ラベル (例: '経費', '売上')
 * @property {function(): string} BTN_CONFIG_PANEL_SETUP      - 設定パネル: パネル設置ボタン
 * @property {function(): string} BTN_CONFIG_ROLE_APPROVER    - 設定パネル: 承認役職ボタン
 * @property {function(): string} BTN_CONFIG_ROLE_VIEWER      - 設定パネル: 閲覧役職ボタン
 * @property {function(): string} BTN_CONFIG_ROLE_APPLICANT   - 設定パネル: 申請/報告役職ボタン
 * @property {function(): string} BTN_CONFIG_CSV_EXPORT       - 設定パネル: CSV発行ボタン
 * @property {function(string): string} SELECT_CONFIG_STORE   - 設定パネル: 店舗選択セレクト
 * @property {function(string): string} SELECT_CONFIG_CHANNEL - 設定パネル: チャンネル選択セレクト
 * @property {function('approver'|'viewer'|'applicant'): string} SELECT_CONFIG_ROLE
 * @property {function(string): string} BTN_STORE_PANEL_REQUEST   - 店舗別: 申請/報告ボタン
 * @property {function(string): string} BTN_STORE_PANEL_ROLE_VIEWER
 * @property {function(string): string} BTN_STORE_PANEL_ROLE_APPLICANT
 * @property {function(string): string} SELECT_REQUEST_ITEM    - 申請: 項目選択
 * @property {function(string): string} MODAL_REQUEST          - 申請: モーダル ID
 * @property {string} BTN_APPROVE_APPROVE
 * @property {string} BTN_APPROVE_EDIT
 * @property {string} BTN_APPROVE_DELETE
 */

function createFeatureIds(featureKey, featureLabel) {
  const FK = featureKey; // 例: 'keihi'
  const FL = featureLabel; // 例: '経費'

  /** @type {FeatureIds} */
  const IDS = {
    FEATURE_KEY: FK,
    FEATURE_LABEL: FL,

    // ---------- 設定パネル ----------
    BTN_CONFIG_PANEL_SETUP: () => `${FK}:config:panel_setup`,
    BTN_CONFIG_ROLE_APPROVER: () => `${FK}:config:role_approver`,
    BTN_CONFIG_ROLE_VIEWER: () => `${FK}:config:role_viewer`,
    BTN_CONFIG_ROLE_APPLICANT: () => `${FK}:config:role_applicant`,
    BTN_CONFIG_CSV_EXPORT: () => `${FK}:config:csv:export`,

    SELECT_CONFIG_STORE: () => `${FK}:config:select:store`,
    SELECT_CONFIG_CHANNEL: (storeName) => `${FK}:config:select:channel:${storeName}`,
    SELECT_CONFIG_ROLE: (type) => `${FK}:config:select:role:${type}`,

    // ---------- 店舗別 申請/報告パネル ----------
    BTN_STORE_PANEL_REQUEST: (storeName) => `${FK}:panel:request:${storeName}`,
    BTN_STORE_PANEL_ROLE_VIEWER: (storeName) => `${FK}:panel:role_viewer:${storeName}`,
    BTN_STORE_PANEL_ROLE_APPLICANT: (storeName) => `${FK}:panel:role_applicant:${storeName}`,

    // ---------- 申請フロー ----------
    SELECT_REQUEST_ITEM: (storeName) => `${FK}:request:select:item:${storeName}`,
    MODAL_REQUEST: (storeName, itemName) => `${FK}:request:modal:${storeName}:${itemName}`,

    // ---------- スレッド内 承認ボタン ----------
    BTN_APPROVE_APPROVE: `${FK}:approve:approve`,
    BTN_APPROVE_EDIT: `${FK}:approve:edit`,
    BTN_APPROVE_DELETE: `${FK}:approve:delete`,
  };

  return IDS;
}

module.exports = { createFeatureIds };
