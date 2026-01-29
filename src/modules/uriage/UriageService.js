// @ts-check
/**
 * src/modules/uriage/UriageService.js
 * 売上機能のビジネスロジック
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./UriageRepository');
const logger = require('../../utils/logger');

/**
 * @typedef {Object} UriageConfig
 * @property {string[]} [approverPositionIds]
 * @property {string[]} [approverRoleIds]
 * @property {string} [csvUpdatedAt]
 */

class UriageService extends StoreServiceBase {
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
     * @param {UriageConfig} config
     * @returns {string}
     */
    resolveApproverMention(guild, storeRoleConfig, config) {
        return super.resolveApproverMention(
            guild,
            storeRoleConfig,
            config.approverPositionIds,
            config.approverRoleIds
        );
    }

    /**
     * 売上操作権限チェック (Keihi パターン踏襲)
     */
    checkPermission(action, member, requesterId, uriageConfig) {
        const approverRoleIds = this._collectApproverRoleIds(uriageConfig);
        const memberRoleIds = new Set(member.roles.cache.keys());
        const isApprover = approverRoleIds.some((id) => memberRoleIds.has(id));

        if (action === 'approve') {
            if (!isApprover) {
                return { ok: false, message: 'この売上報告を承認する権限がありません。' };
            }
        } else {
            const isOriginalRequester = requesterId === member.id;
            if (!isApprover && !isOriginalRequester) {
                return { ok: false, message: 'この売上報告を操作する権限がありません。' };
            }
        }
        return { ok: true, message: null };
    }

    _collectApproverRoleIds(uriageConfig) {
        const set = new Set();
        const sources = [uriageConfig.approverRoleIds, uriageConfig.approvalRoles];
        for (const src of sources) {
            if (Array.isArray(src)) {
                src.forEach(id => id && set.add(id));
            }
        }
        return Array.from(set);
    }

    updateRecordStatus(records, targetId, newStatus, metadata) {
        if (!Array.isArray(records)) return null;

        const record = records.find(r => String(r.id) === String(targetId));
        if (!record) return null;

        const prevStatus = record.status;
        const amount = Number(record.amount || 0);

        record.status = newStatus;
        record.statusJa = newStatus === 'APPROVED' ? '承認' : '報告中';
        record.lastUpdated = new Date().toISOString();

        if (newStatus === 'APPROVED' && metadata.approver) {
            record.approvedById = metadata.approver.id;
            record.approvedBy = metadata.approver.displayName || metadata.approver.user?.username;
            record.approvedAt = record.lastUpdated;
        }

        return { record, prevStatus, amount };
    }

    recalculateTotal(dataObject, type) {
        if (type === 'daily') {
            if (!Array.isArray(dataObject.reports)) return;
            dataObject.totalApprovedAmount = dataObject.reports
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

module.exports = new UriageService();
