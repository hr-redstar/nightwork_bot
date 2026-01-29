// @ts-check
/**
 * src/modules/keihi/KeihiService.js
 * 経費機能のビジネスロジック
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./KeihiRepository');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} KeihiConfig
 * @property {string[]} [approverPositionIds]
 * @property {string[]} [approverRoleIds]
 * @property {string[]} [approvalRoles]
 */

class KeihiService extends StoreServiceBase {
    /**
     * 設定パネル用のデータを準備
     * @param {import('discord.js').Guild} guild
     */
    async prepareSettingPanelData(guild) {
        const guildId = guild.id;
        const config = await repo.getGlobalConfig(guildId);
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);

        return {
            config,
            storeRoleConfig
        };
    }

    /**
     * 承認権限を持つロール名を解決
     * @param {import('discord.js').Guild} guild
     * @param {any} storeRoleConfig
     * @param {KeihiConfig} keihiConfig
     * @returns {string}
     */
    describeApprovers(guild, storeRoleConfig, keihiConfig) {
        return this.resolveApproverMention(
            guild,
            storeRoleConfig,
            keihiConfig?.approverPositionIds,
            keihiConfig?.approverRoleIds || keihiConfig?.approvalRoles
        );
    }
    /**
     * 経費操作権限チェック
     * @param {'approve' | 'modify' | 'delete'} action
     * @param {import('discord.js').GuildMember} member
     * @param {string|null} requesterId
     * @param {any} keihiConfig
     */
    checkPermission(action, member, requesterId, keihiConfig) {
        const approverRoleIds = this._collectApproverRoleIds(keihiConfig);
        const memberRoleIds = new Set(member.roles.cache.keys());
        const isApprover = approverRoleIds.some((id) => memberRoleIds.has(id));

        if (action === 'approve') {
            if (!isApprover) {
                return { ok: false, message: 'この経費申請を承認する権限がありません。' };
            }
        } else {
            // modify, delete
            const isOriginalRequester = requesterId === member.id;
            if (!isApprover && !isOriginalRequester) {
                return { ok: false, message: 'この経費申請を操作する権限がありません。' };
            }
        }
        return { ok: true, message: null };
    }

    /**
     * 承認役職IDを収集（コンフィグの複数フィールドを統合）
     */
    _collectApproverRoleIds(keihiConfig) {
        const set = new Set();
        const sources = [keihiConfig.approverRoleIds, keihiConfig.approvalRoles];
        for (const src of sources) {
            if (Array.isArray(src)) {
                src.forEach(id => id && set.add(id));
            }
        }
        return Array.from(set);
    }

    /**
     * 経費レコードのステータス更新計算
     * @param {any} records 日/月/年のレコード
     * @param {string} targetId
     * @param {string} newStatus
     * @param {object} metadata
     */
    updateRecordStatus(records, targetId, newStatus, metadata) {
        if (!Array.isArray(records)) return null;

        const record = records.find(r => String(r.id) === String(targetId));
        if (!record) return null;

        const prevStatus = record.status;
        const amount = Number(record.amount || 0);

        // Update fields
        record.status = newStatus;
        record.statusJa = newStatus === 'APPROVED' ? '承認' : '申請中';
        record.lastUpdated = new Date().toISOString();

        if (newStatus === 'APPROVED' && metadata.approver) {
            record.approvedById = metadata.approver.id;
            record.approvedBy = metadata.approver.displayName || metadata.approver.user?.username;
            record.approvedAt = record.lastUpdated;
        }

        return { record, prevStatus, amount };
    }

    /**
     * 合計金額の再計算
     * @param {any} dataObject
     * @param {string} type 'daily' | 'monthly' | 'yearly'
     */
    recalculateTotal(dataObject, type) {
        if (type === 'daily') {
            if (!Array.isArray(dataObject.requests)) return;
            dataObject.totalApprovedAmount = dataObject.requests
                .filter(r => r.status === 'APPROVED')
                .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        } else if (type === 'monthly') {
            if (!dataObject.byDay) return;
            dataObject.totalApprovedAmount = Object.values(dataObject.byDay)
                .reduce((sum, v) => sum + (Number(v) || 0), 0);
        } else if (type === 'yearly') {
            if (!dataObject.byMonth) return;
            dataObject.totalApprovedAmount = Object.values(dataObject.byMonth)
                .reduce((sum, v) => sum + (Number(v) || 0), 0);
        }
    }
}

module.exports = new KeihiService();
