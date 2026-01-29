// @ts-check
/**
 * src/modules/sougei/SougeiService.js
 * 送迎管理のビジネスロジック (Platinum 基準)
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./SougeiRepository');
const logger = require('../../utils/logger');

class SougeiService extends StoreServiceBase {
    /**
     * 設定パネル表示用のデータを準備
     * @param {string} guildId 
     */
    async prepareSettingData(guildId) {
        const config = await repo.getConfig(guildId);
        const storeRoleConfig = await this.loadStoreRoleConfig(guildId);

        return { config, storeRoleConfig };
    }

    /**
     * 送迎者役職に紐づくメンバーを抽出し、一覧テキストを生成
     * @param {import('discord.js').Guild} guild 
     * @param {string[]} roleIds 
     */
    async getSougeiMemberText(guild, roleIds) {
        if (!roleIds || roleIds.length === 0) return '未設定';

        try {
            // ロール情報を取得し、メンバーを収集
            const members = new Set();
            for (const roleId of roleIds) {
                const role = await guild.roles.fetch(roleId).catch(() => null);
                if (!role) continue;
                role.members.forEach(m => members.add(m));
            }

            if (members.size === 0) return '該当者なし（役職に誰もいません）';

            return Array.from(members)
                .map(m => `・${m.displayName} (<@${m.id}>)`)
                .join('\n');
        } catch (err) {
            logger.error('[SougeiService] メンバー抽出エラー:', err);
            return 'エラー：メンバーの取得に失敗しました';
        }
    }
}

module.exports = new SougeiService();
