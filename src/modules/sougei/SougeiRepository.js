// @ts-check
/**
 * src/modules/sougei/SougeiRepository.js
 * 送迎管理の設定および担当者データの永続化
 */

const { readJSON, saveJSON } = require('../../utils/gcs');
const logger = require('../../utils/logger');

class SougeiRepository {
    /**
     * @param {string} guildId 
     */
    configPath(guildId) {
        return `${guildId}/sougei/config.json`;
    }

    /**
     * 送迎設定を取得
     * @param {string} guildId 
     */
    async getConfig(guildId) {
        try {
            return (await readJSON(this.configPath(guildId))) || {
                panelChannelId: null,
                panelMessageId: null,
                sougeiRoleIds: [], // 送迎者役職のロールID一覧
                lastUpdated: null
            };
        } catch (err) {
            return { sougeiRoleIds: [] };
        }
    }

    /**
     * 送迎設定を保存
     * @param {string} guildId 
     * @param {any} config 
     */
    async saveConfig(guildId, config) {
        config.lastUpdated = new Date().toISOString();
        await saveJSON(this.configPath(guildId), config);
    }
}

module.exports = new SougeiRepository();
