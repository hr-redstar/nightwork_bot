// src/utils/uriage/uriageValidator.js
// ----------------------------------------------------
// 売上機能 向けバリデーション & 権限チェック
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

module.exports = {
  hasAnyRole,
};