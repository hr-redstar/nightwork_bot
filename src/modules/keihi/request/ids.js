// src/handlers/keihi/request/ids.js
// ----------------------------------------------------
// 経費「申請パネル」用 customId 一元管理
// ----------------------------------------------------

const PREFIX = 'keihi_request';

const ITEM_CONFIG_MODAL_BASE = `${PREFIX}:modal_item_config`;
const ITEM_CONFIG_BUTTON_BASE = `${PREFIX}:btn:item_config`;

function normalizeStoreKey(storeKey) {
  // ":" 連続の互換もあるので落とす
  return String(storeKey ?? '').replace(/^:+/, '').trim();
}

const IDS = {
  ACTION: {
    ITEM_CONFIG: 'item_config',
    VIEW_ROLES: 'view_roles',
    REQUEST_ROLES: 'request_roles',
    REQUEST: 'request',
  },

  PREFIX: {
    BUTTON: `${PREFIX}:btn`,
    VIEW_ROLE_SELECT: `${PREFIX}:sel_view_roles`,
    REQUEST_ROLE_SELECT: `${PREFIX}:sel_req_roles`,
    // startsWith 用（末尾 ":" なし）
    ITEM_CONFIG_MODAL: ITEM_CONFIG_MODAL_BASE,
  },
};

function buildItemConfigModalId(storeKey) {
  // ⚠ customId は 100 文字制限があるので storeKey は短い前提（数値ID推奨）
  const key = normalizeStoreKey(storeKey);
  return `${ITEM_CONFIG_MODAL_BASE}:${key}`;
}

function parseItemConfigModalId(customId) {
  if (!customId || !customId.startsWith(ITEM_CONFIG_MODAL_BASE)) return null;

  // base の後ろを取り出して ":" を全部落とす（: / :: / ::: 互換）
  let tail = customId.slice(ITEM_CONFIG_MODAL_BASE.length);
  tail = tail.replace(/^:+/, '');

  // 将来 `...:storeKey::anything` になっても先頭だけ採用
  const key = normalizeStoreKey(tail.split('::')[0]);
  return key || null;
}

module.exports = {
  PREFIX,

  // 互換のため残す（参照されてる可能性がある）
  ITEM_CONFIG_MODAL_PREFIX: `${ITEM_CONFIG_MODAL_BASE}:`,
  ITEM_CONFIG_BUTTON_PREFIX: `${ITEM_CONFIG_BUTTON_BASE}:`,

  buildItemConfigModalId,
  parseItemConfigModalId,

  IDS,
};
