// @ts-check
/**
 * src/modules/uriage/UriageService.js
 * 売上機能のビジネスロジック
 */

const BaseService = require('../../structures/BaseService');
const repo = require('./UriageRepository');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} UriageConfig
 * @property {string[]} [approverPositionIds]
 * @property {string[]} [approverRoleIds]
 * @property {string} [csvUpdatedAt]
 */

class UriageService extends BaseService {
    /**
     * 設定パネル用のデータを準備
     * @param {import('discord.js').Guild} guild
     */
    async prepareSettingPanelData(guild) {
        const guildId = guild.id;
        const config = await repo.getGlobalConfig(guildId);

        let storeRoleConfig = null;
        try {
            storeRoleConfig = await loadStoreRoleConfig(guildId);
        } catch (err) {
            logger.warn('[UriageService] storeRoleConfig 読み込み失敗', err);
        }

        return {
            config,
            storeRoleConfig
        };
    }

    /**
     * ロールIDの配列をメンション文字列に変換
     * @param {import('discord.js').Guild} guild
     * @param {string[]} ids
     * @returns {string | null}
     */
    roleMentionFromIds(guild, ids = []) {
        const mentions = ids
            .map((id) => {
                const role = guild.roles.cache.get(id);
                return role ? `<@&${role.id}>` : null;
            })
            .filter(Boolean);
        return mentions.length ? mentions.join(' ') : null;
    }

    /**
     * 承認権限を持つロール名を解決
     * @param {import('discord.js').Guild} guild
     * @param {any} storeRoleConfig
     * @param {UriageConfig} config
     * @returns {string}
     */
    resolveApproverMention(guild, storeRoleConfig, config) {
        const positionRoles =
            storeRoleConfig?.positionRoles || storeRoleConfig?.positionRoleMap || {};

        const positionLookup = (/** @type {string} */ positionId) => {
            const roles = storeRoleConfig?.roles || storeRoleConfig?.positions || [];
            const found = Array.isArray(roles)
                ? roles.find(
                    (/** @type {any} */ r) => String(r.id ?? r.positionId ?? r.position) === String(positionId)
                )
                : null;
            if (found && found.name) return found.name;
            return typeof positionId === 'string' ? positionId : String(positionId);
        };

        const positionIds = config.approverPositionIds || [];
        const fallbackRoleIds = config.approverRoleIds || [];

        const lines = [];

        if (positionIds.length) {
            for (const posId of positionIds) {
                const mention = this.roleMentionFromIds(
                    guild,
                    Array.isArray(positionRoles[posId])
                        ? positionRoles[posId]
                        : positionRoles[posId] ? [positionRoles[posId]] : []
                );
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

module.exports = new UriageService();
