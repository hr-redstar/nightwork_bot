/**
 * src/modules/tennai_hikkake/HikkakeRepository.js
 * 店内状況・ひっかけ機能のデータアクセスレイヤー
 */

const BaseRepository = require('../../structures/BaseRepository');
const { readJSON, writeJSON } = require('../../utils/tennai_hikkake/gcsTennaiHikkake');

class HikkakeRepository extends BaseRepository {
    constructor() {
        super(null); // Wrapping specific GCS helpers
    }

    async getGlobalConfig(guildId) {
        return await readJSON(guildId, 'config.json') || { panels: {}, lastUpdated: null };
    }

    async saveGlobalConfig(guildId, data) {
        data.lastUpdated = new Date().toISOString();
        return await writeJSON(guildId, 'config.json', data);
    }
}

module.exports = new HikkakeRepository();
