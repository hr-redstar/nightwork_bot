// @ts-check
/**
 * src/modules/common/StoreServiceBase.js
 * 店舗・役職解決の共通ロジックを提供する基底クラス
 */

const BaseService = require('../../structures/BaseService');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const logger = require('../../utils/logger');

class StoreServiceBase extends BaseService {
    /**
     * 店舗ロール設定をロード
     * @param {string} guildId
     */
    async loadStoreRoleConfig(guildId) {
        try {
            return await loadStoreRoleConfig(guildId);
        } catch (err) {
            logger.warn(`[${this.constructor.name}] storeRoleConfig 読み込み失敗`, err);
            return null;
        }
    }

    /**
     * ロールIDの配列をメンション文字列に変換
     * @param {import('discord.js').Guild} guild
     * @param {string[]} ids
     * @returns {string | null}
     */
    roleMentionFromIds(guild, ids = []) {
        if (!ids || !ids.length) return null;
        const mentions = ids
            .map((id) => {
                const role = guild.roles.cache.get(id);
                return role ? `<@&${role.id}>` : null;
            })
            .filter(Boolean);
        return mentions.length ? mentions.join(' ') : null;
    }

    /**
     * 承認権限を持つロール名を解決（共通フォーマット）
     * @param {import('discord.js').Guild} guild
     * @param {any} storeRoleConfig
     * @param {string[]} positionIds
     * @param {string[]} fallbackRoleIds
     * @returns {string}
     */
    resolveApproverMention(guild, storeRoleConfig, positionIds = [], fallbackRoleIds = []) {
        const positionRoles = storeRoleConfig?.positionRoles || storeRoleConfig?.positionRoleMap || {};

        const positionLookup = (/** @type {string} */ positionId) => {
            const roles = storeRoleConfig?.roles || storeRoleConfig?.positions || [];
            const found = Array.isArray(roles)
                ? roles.find(r => String(r.id ?? r.positionId ?? r.position) === String(positionId))
                : null;
            return found?.name || String(positionId);
        };

        const lines = [];

        if (positionIds.length) {
            for (const posId of positionIds) {
                const roleIds = Array.isArray(positionRoles[posId])
                    ? positionRoles[posId]
                    : (positionRoles[posId] ? [positionRoles[posId]] : []);
                const mention = this.roleMentionFromIds(guild, roleIds);
                const name = positionLookup(posId);
                lines.push(`${name}: ${mention || '未紐付ロール'}`);
            }
        } else if (fallbackRoleIds.length) {
            const mentions = this.roleMentionFromIds(guild, fallbackRoleIds);
            lines.push(mentions || '役職IDあり');
        }

        return lines.length ? lines.join('\n') : '未設定';
    }
}

module.exports = StoreServiceBase;
