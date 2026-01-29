/**
 * src/modules/level/LevelRepository.js
 * レベル機能のリポジトリ層
 * -----------------------------------------
 * - 設定情報 (config.json)
 * - ユーザーXPデータ (levels.json) を管理
 */

const BaseRepository = require('../../structures/BaseRepository');

class LevelRepository extends BaseRepository {
    constructor() {
        super('level', 'config.json');
        this.userStorage = new BaseRepository('level', 'levels.json');
    }

    /**
     * レベル設定を取得
     */
    async getConfig(guildId) {
        return await this.load(guildId, {
            channelId: null,
            message: '✨ {user} さんのレベルが {level} に上がりました！',
            xp: {
                chat: { type: 'count', xp: 5 },
                vc: { perMinute: 1 }
            }
        });
    }

    /**
     * レベル設定を保存
     */
    async saveConfig(guildId, config) {
        return await this.save(guildId, config);
    }

    /**
     * ユーザーのXPデータを取得
     * @returns {Promise<Object>} { userId: { xp: number, level: number } }
     */
    async loadUserData(guildId) {
        return await this.userStorage.load(guildId, {});
    }

    /**
     * ユーザーのXPデータを保存
     */
    async saveUserData(guildId, data) {
        return await this.userStorage.save(guildId, data);
    }
}

module.exports = new LevelRepository();
