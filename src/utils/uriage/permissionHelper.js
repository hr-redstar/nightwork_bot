// src/utils/uriage/permissionHelper.js
// 承認・申請権限などの判定ヘルパー（最小限のスタブ）

/**
 * 管理者または指定ロールを持つかを判定
 * @param {import('discord.js').GuildMember} member
 * @param {string[]} roleIds
 * @returns {boolean}
 */
function hasAnyRole(member, roleIds = []) {
  if (!member) return false;
  if (member.permissions?.has('Administrator')) return true;
  const set = new Set(roleIds.filter(Boolean));
  return member.roles.cache.some(r => set.has(r.id));
}

module.exports = { hasAnyRole };
