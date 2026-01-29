/**
 * src/utils/permission/RoleResolver.js
 * 役職・権限チェックの共通ユーティリティ
 * -----------------------------------------
 * - メンバーのロール保持チェック
 * - ロールIDからの名前解決（メンション生成）
 * - 管理者権限の考慮
 */

const { PermissionsBitField } = require('discord.js');

const RoleResolver = {
    /**
     * メンバーが指定されたいずれかのロールを持っているか確認
     * @param {import('discord.js').GuildMember} member
     * @param {Array<string>} allowedRoleIds
     * @param {boolean} [allowAdmin=true] - 管理者の場合、ロールを持っていなくても許可するか
     */
    hasAnyRole(member, allowedRoleIds, allowAdmin = true) {
        if (!member) return false;

        // 管理者チェック
        if (allowAdmin && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return true;
        }

        if (!allowedRoleIds || allowedRoleIds.length === 0) return false;

        return allowedRoleIds.some(roleId => member.roles.cache.has(roleId));
    },

    /**
     * ロールメンションを生成 (存在しない場合は名前、それもなければIDを表示)
     * @param {import('discord.js').Guild} guild
     * @param {string} roleId
     */
    resolveMention(guild, roleId) {
        if (!roleId) return '未指定';
        const role = guild.roles.cache.get(roleId);
        return role ? `<@&${role.id}>` : `不明な役職(ID: ${roleId})`;
    },

    /**
     * 複数のロールメンションを結合して表示用文字列にする
     */
    resolveMentions(guild, roleIds) {
        if (!roleIds || roleIds.length === 0) return 'なし';
        return roleIds.map(rid => this.resolveMention(guild, rid)).join(', ');
    }
};

module.exports = RoleResolver;
