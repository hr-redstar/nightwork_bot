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
const { saveKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
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
/**
 * @param {object} param0
 * @param {import('discord.js').TextChannel} param0.parentChannel
 * @param {string} param0.storeName
 * @param {Date} param0.now
 */
async function findOrCreateKeihiThread({ parentChannel, storeName, now }) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const threadName = `${yyyy}-${mm}-${storeName}-経費申請`;

  // 既存スレッド（アクティブのみ）を検索
  let thread = parentChannel.threads.cache.find((t) => t.name === threadName) || null;
  if (!thread) {
    const active = await parentChannel.threads.fetchActive();
    thread = active.threads.find((t) => t.name === threadName) || null;
  }

  // なければ新規作成（プライベートスレッド）
  if (!thread) {
    thread = await parentChannel.threads.create({
      name: threadName,
      autoArchiveDuration: 10080, // 7日
      type: ChannelType.PrivateThread,
      reason: `経費申請スレッド作成: ${storeName}`,
    });
  }

  return { thread };
}

// ----------------------------------------------------
// スレッドに権限のあるメンバーを追加
// ----------------------------------------------------
async function addMembersToThread(thread, guild, requester, allowedRoleIds) {
  try {
    const uniqueRoleIds = [...new Set(allowedRoleIds.filter(Boolean))];
    if (uniqueRoleIds.length) {
      for (const roleId of uniqueRoleIds) {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (!role) continue;

        for (const member of role.members.values()) {
          if (thread.members.cache.has(member.id)) continue;
          await thread.members.add(member.id).catch((err) => {
            logger.warn(`スレッドにメンバー(ID: ${member.id})を追加できませんでした。`, err);
          });
        }
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
// 店舗別の経費申請パネルを最新化して保存
//  - 既存削除→再送信（messageId更新）
//  - keihi/config.json 保存
//  - 経費設定パネルも更新（店舗一覧のリンク更新）
// ----------------------------------------------------
async function refreshPanelAndSave(guild, storeKey, keihiConfig, storeRoleConfig) {
  if (!guild) return;

  try {
    logger.info('[keihi/request/helpers] refreshPanelAndSave start', { storeKey });

    // ✅ パネルを削除→再送信して最新化（messageId が変わる）
    const msg = await upsertStorePanelMessage(guild, storeKey, keihiConfig, storeRoleConfig);

    // ✅ keihi/config.json に messageId 更新を保存
    await saveKeihiConfig(guild.id, keihiConfig);

    logger.info('[keihi/request/helpers] refreshPanelAndSave saved', {
      storeKey,
      newMessageId: msg?.id || null,
    });

    // ✅ 経費設定パネル側（一覧のリンク）も更新
    try {
      const mod = require('../setting/panel');

      const fn =
        mod.refreshSettingPanelAndSave ||
        mod.refreshKeihiSettingPanelMessage ||
        mod.refreshKeihiSettingPanelAndSave ||
        mod.upsertSettingPanelMessage ||
        mod.refreshSettingPanel;

      if (typeof fn === 'function') {
        await fn(guild, keihiConfig, storeRoleConfig);
      } else {
        logger.warn('[keihi/request/helpers] no setting panel refresh function exported');
      }
    } catch (e) {
      logger.warn('[keihi/request/helpers] setting panel refresh failed', e);
    }
  } catch (err) {
    logger.error('[keihi/request/helpers] refreshPanelAndSave failed', err);
  }
}

module.exports = {
  collectAllowedRoleIdsForRequest,
  validateAndGetData,
  findOrCreateKeihiThread,
  addMembersToThread,
  refreshPanelAndSave,
};
