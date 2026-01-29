/**
 * src/modules/welcome/WelcomeRepository.js
 * ようこそ設定のリポジトリ層
 */

const BaseRepository = require('../../structures/BaseRepository');

class WelcomeRepository extends BaseRepository {
    constructor() {
        super('welcome', 'config.json');
    }

    async getConfig(guildId) {
        return await this.load(guildId, {
            channelId: null,
            message: '🎉 {user} さん、いらっしゃいませ！',
            randomImage: {
                enabled: false,
                images: []
            }
        });
    }

    async saveConfig(guildId, config) {
        return await this.save(guildId, config);
    }
}

module.exports = new WelcomeRepository();
