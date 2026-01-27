/**
 * src/modules/kpi/KpiRepository.js
 * KPIデータのデータアクセスレイヤー
 */

const BaseRepository = require('../../structures/BaseRepository');
const ConfigManager = require('../../config/ConfigManager');
const { z } = require('zod');

// Schema 定義 (Zod)
const KpiConfigSchema = z.object({
    approveRoleId: z.string().nullable().optional(),
    channels: z.record(z.string()).default({}), // storeId -> channelId
    lastUpdated: z.string().nullable().optional(),
}).passthrough();

const manager = new ConfigManager({
    baseDir: 'kpi',
    fileName: 'config.json',
    schema: KpiConfigSchema,
});

class KpiRepository extends BaseRepository {
    constructor() {
        super(manager);
    }

    /**
     * KPI設定を読み込み
     */
    async getConfig(guildId) {
        return await this.find(guildId);
    }
}

module.exports = new KpiRepository();
