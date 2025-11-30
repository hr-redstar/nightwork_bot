// src/handlers/keihi/request/statusHelpers.js
// ----------------------------------------------------
// 経費申請ステータス操作の共通ヘルパー
// ----------------------------------------------------

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { IDS } = require('./statusIds');

/**
 * Embedから特定のフィールド値を取得する
 * @param {import('discord.js').Embed} embed
 * @param {string} fieldName
 * @returns {string}
 */
function getEmbedFieldValue(embed, fieldName) {
  const field = embed?.fields?.find((f) => f.name === fieldName);
  return field ? field.value : '不明';
}

/**
 * 承認役職ID一覧を取得する
 * @param {object} keihiConfig
 * @returns {string[]}
 */
function collectApproverRoleIds(keihiConfig) {
  const set = new Set();

  if (Array.isArray(keihiConfig.approverRoleIds)) {
    for (const id of keihiConfig.approverRoleIds) {
      if (id) set.add(id);
    }
  }

  if (Array.isArray(keihiConfig.approvalRoles)) {
    for (const id of keihiConfig.approvalRoles) {
      if (id) set.add(id);
    }
  }

  return Array.from(set);
}

/**
 * 経費申請の操作権限をチェックする
 * @param {'approve' | 'modify' | 'delete'} action
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Embed} embed
 * @param {string[]} approverRoleIds
 * @returns {{hasPermission: boolean, message: string | null}}
 */
function checkStatusActionPermission(action, member, embed, approverRoleIds) {
  const memberRoleIds = new Set(member.roles.cache.keys());
  const isApprover = approverRoleIds.some((id) => memberRoleIds.has(id));

  if (action === 'approve') {
    if (!isApprover) {
      return { hasPermission: false, message: 'この経費申請を承認する権限がありません。' };
    }
  } else { // modify, delete
    const originalInputUserMention = getEmbedFieldValue(embed, '入力者');
    const originalInputUserId = originalInputUserMention.match(/<@!?(\d+)>/)?.[1] || null;
    const isOriginalRequester = originalInputUserId === member.id;

    if (!isApprover && !isOriginalRequester) {
      return { hasPermission: false, message: 'この経費申請を操作する権限がありません。' };
    }
  }

  return { hasPermission: true, message: null };
}

/**
 * ステータスボタンの行を再構築する
 * @param {string} storeId
 * @param {string} threadId
 * @param {string} messageId
 * @param {string} status
 * @returns {ActionRowBuilder<ButtonBuilder>}
 */
function buildStatusButtons(storeId, threadId, messageId, status) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${IDS.APPROVE}::${storeId}::${threadId}::${messageId}::${status}`).setLabel('承認').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${IDS.MODIFY}::${storeId}::${threadId}::${messageId}::${status}`).setLabel('修正').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${IDS.DELETE}::${storeId}::${threadId}::${messageId}::${status}`).setLabel('削除').setStyle(ButtonStyle.Danger),
  );
}

module.exports = {
  getEmbedFieldValue,
  collectApproverRoleIds,
  checkStatusActionPermission,
  buildStatusButtons,
};