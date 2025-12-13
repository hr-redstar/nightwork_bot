// src/handlers/keihi/request/helpers.js
// ----------------------------------------------------
// 経費申請フロー共通ヘルパー
//   - ロール判定
//   - モーダル入力のバリデーション
//   - スレッド作成 / 検索
//   - スレッドへのメンバー追加
//   - パネル再描画 & config 更新
// ----------------------------------------------------

const { ChannelType } = require('discord.js');
const {
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { upsertStorePanelMessage } = require('./panel');
const logger = require('../../../utils/logger');

// ----------------------------------------------------
// positionIds と storeRoleConfig からロールID配列を作る共通処理
//   - storeRoleConfig.positionRoles / positionRoleMap に対応
//   - 値が配列でも単体でもOK
// ----------------------------------------------------
function resolveRoleIdsFromPositions(storeRoleConfig, positionIds) {
  if (!storeRoleConfig || !Array.isArray(positionIds)) return [];

  const positionRoles =
    storeRoleConfig.positionRoles || storeRoleConfig.positionRoleMap || {};

  const roleIds = positionIds.flatMap((posId) => {
    const raw = positionRoles[posId];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  });

  return [...new Set(roleIds.filter(Boolean))];
}

// ----------------------------------------------------
// 経費申請ボタンを押してよいロール一覧を取得
//   - 店舗の閲覧役職 / 申請役職 / グローバル承認役職
//   - 新旧両方の設定形式に対応
// ----------------------------------------------------
function collectAllowedRoleIdsForRequest(keihiConfig, storeId, storeRoleConfig) {
  const panel = keihiConfig.panels?.[storeId] || {};

  const allowed = new Set();
  const approverSet = new Set();

  // 店舗ごとの閲覧役職 / 申請役職（ロールID直接）
  for (const id of panel.viewRoleIds || []) {
    if (id) allowed.add(id);
  }
  for (const id of panel.requestRoleIds || []) {
    if (id) allowed.add(id);
  }

  // 店舗ごとの閲覧役職 / 申請役職（役職ID → ロールID）
  if (storeRoleConfig) {
    const viewRoleIdsFromPositions = resolveRoleIdsFromPositions(
      storeRoleConfig,
      panel.viewRolePositionIds,
    );
    const requestRoleIdsFromPositions = resolveRoleIdsFromPositions(
      storeRoleConfig,
      panel.requestRolePositionIds,
    );

    for (const id of viewRoleIdsFromPositions) {
      if (id) allowed.add(id);
    }
    for (const id of requestRoleIdsFromPositions) {
      if (id) allowed.add(id);
    }
  }

  // グローバル承認役職 (/設定経費 の承認役職)
  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (!id) continue;
      approverSet.add(id);
      allowed.add(id);
    }
  }
  // 旧フィールド互換
  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (!id) continue;
      approverSet.add(id);
      allowed.add(id);
    }
  }

  // さらに旧仕様: keihiConfig.roles.request + storeRoleConfig.links.link_role_role
  if (
    keihiConfig.roles &&
    keihiConfig.roles.request &&
    storeRoleConfig?.links?.link_role_role
  ) {
    const requestRoleName = keihiConfig.roles.request;
    const extraRoleIds =
      storeRoleConfig.links.link_role_role[requestRoleName] || [];
    for (const rid of extraRoleIds) {
      if (rid) allowed.add(rid);
    }
  }

  return {
    allowedRoleIds: Array.from(allowed),
    approverRoleIds: Array.from(approverSet),
  };
}

// ----------------------------------------------------
// モーダル入力のバリデーション
// ----------------------------------------------------
function validateAndGetData(interaction) {
  const dateStr = (interaction.fields.getTextInputValue('date') || '').trim();
  const department =
    (interaction.fields.getTextInputValue('department') || '').trim() || '未入力';
  const itemName = (interaction.fields.getTextInputValue('item') || '').trim();
  const amountStr = (interaction.fields.getTextInputValue('amount') || '').trim();
  const note = (interaction.fields.getTextInputValue('note') || '').trim();

  if (!dateStr) {
    return { error: '日付は必須です。', data: null };
  }

  if (!itemName) {
    return { error: '経費項目は必須です。', data: null };
  }

  const amount = Number(amountStr.replace(/[,，]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: '金額は 0 より大きい半角数字で入力してください。', data: null };
  }

  return {
    error: null,
    data: { dateStr, department, itemName, amount, note },
  };
}

// ----------------------------------------------------
// 経費申請用のスレッドを検索または作成する（プライベート）
// ----------------------------------------------------
async function findOrCreateExpenseThread(channel, dateStr, storeName) {
  let baseDate = new Date();
  const m = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    if (!Number.isNaN(y) && !Number.isNaN(mo) && !Number.isNaN(d)) {
      baseDate = new Date(y, mo, d);
    }
  }
  const yyyy = baseDate.getFullYear();
  const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
  const threadName = `${yyyy}-${mm}-${storeName}-経費申請`;

  // 既存スレッド（アクティブのみ）を検索
  let thread = channel.threads.cache.find((t) => t.name === threadName) || null;
  if (!thread) {
    const active = await channel.threads.fetchActive();
    thread = active.threads.find((t) => t.name === threadName) || null;
  }

  // なければ新規作成（プライベートスレッド）
  if (!thread) {
    thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 10080, // 7日
      type: ChannelType.PrivateThread,
      reason: `経費申請スレッド作成: ${storeName}`,
    });
  }

  return thread;
}

// ----------------------------------------------------
// スレッドに権限のあるメンバーを追加
// ----------------------------------------------------
async function addMembersToThread(thread, guild, requester, allowedRoleIds) {
  try {
    if (allowedRoleIds.length) {
      const allMembers = await guild.members.fetch();
      for (const mbr of allMembers.values()) {
        const hasTargetRole = mbr.roles.cache.some((r) =>
          allowedRoleIds.includes(r.id),
        );
        if (!hasTargetRole) continue;
        if (thread.members.cache.has(mbr.id)) continue;

        await thread.members.add(mbr.id).catch((err) => {
          logger.warn(`スレッドにメンバー(ID: ${mbr.id})を追加できませんでした。`, err);
        });
      }
    }

    if (!thread.members.cache.has(requester.id)) {
      await thread.members.add(requester.id).catch((err) => {
        logger.warn(`スレッドに申請者(ID: ${requester.id})を追加できませんでした。`, err);
      });
    }
  } catch (e) {
    logger.warn(
      '[keihi/request/helpers] スレッドへのメンバー追加中にエラーが発生しました',
      e,
    );
  }
}

// ----------------------------------------------------
// 経費申請パネルを再描画し、config の messageId を更新
// ----------------------------------------------------
async function refreshPanelAndSave(guild, storeId, keihiConfig, storeRoleConfig) {
  // keihiConfig は upsertStorePanelMessage によって直接変更されるため、
  // 呼び出し後にそのオブジェクトを保存する
  const updatedConfig = keihiConfig;

  // 新しいパネルを送信 / 更新
  const updatedPanelMessage = await upsertStorePanelMessage(
    guild,
    storeId,
    updatedConfig,
    storeRoleConfig,
  );

  if (!updatedPanelMessage) return;

  // upsertStorePanelMessage で keihiConfig オブジェクトは更新されているので、
  // それをそのまま保存する。
  // 注意：この関数は keihiConfig を直接変更します。
  await saveKeihiConfig(guild.id, updatedConfig);
}

module.exports = {
  collectAllowedRoleIdsForRequest,
  validateAndGetData,
  findOrCreateExpenseThread,
  addMembersToThread,
  refreshPanelAndSave,
};
