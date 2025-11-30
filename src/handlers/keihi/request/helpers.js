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
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const { upsertStorePanelMessage } = require('./panel');

// ----------------------------------------------------
// 経費申請ボタンを押してよいロール一覧を取得
//   - 店舗の閲覧役職 / 申請役職 / グローバル承認役職
// ----------------------------------------------------
function collectAllowedRoleIdsForRequest(keihiConfig, storeId) {
  const panel = keihiConfig.panels?.[storeId] || {};

  const allowed = new Set();

  // 店舗ごとの閲覧役職 / 申請役職
  for (const id of panel.viewRoleIds || []) {
    if (id) allowed.add(id);
  }
  for (const id of panel.requestRoleIds || []) {
    if (id) allowed.add(id);
  }

  // グローバル承認役職（/設定経費 の承認役職）
  const approverSet = new Set();
  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (id) {
        approverSet.add(id);
        allowed.add(id);
      }
    }
  }
  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (id) {
        approverSet.add(id);
        allowed.add(id);
      }
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
  const department = (interaction.fields.getTextInputValue('department') || '').trim() || '未入力';
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
  let thread =
    channel.threads.cache.find((t) => t.name === threadName) || null;
  if (!thread) {
    const active = await channel.threads.fetchActive();
    thread = active.threads.find((t) => t.name === threadName) || null;
  }

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
        await thread.members.add(mbr.id).catch(() => {});
      }
    }

    if (!thread.members.cache.has(requester.id)) {
      await thread.members.add(requester.id).catch(() => {});
    }
  } catch (e) {
    console.warn('スレッドへのメンバー追加中にエラーが発生しました:', e);
  }
}

// ----------------------------------------------------
// 経費申請パネルを再描画し、config の messageId を更新
// ----------------------------------------------------
async function refreshPanelAndSave(guild, storeId, keihiConfig, storeRoleConfig) {
  const panelConfig = keihiConfig.panels?.[storeId];
  const updatedPanelMessage = await upsertStorePanelMessage(
    guild,
    storeId,
    keihiConfig,
    storeRoleConfig,
  );

  if (updatedPanelMessage && panelConfig && updatedPanelMessage.id !== panelConfig.messageId) {
    const latestConfig = await loadKeihiConfig(guild.id);
    latestConfig.panels[storeId].messageId = updatedPanelMessage.id;
    await saveKeihiConfig(guild.id, latestConfig);
    console.log(
      `[requestFlow/helpers] パネルを再生成し、新しいメッセージID (${updatedPanelMessage.id}) を保存しました。`,
    );
  }
}

module.exports = {
  collectAllowedRoleIdsForRequest,
  validateAndGetData,
  findOrCreateExpenseThread,
  addMembersToThread,
  refreshPanelAndSave,
};
