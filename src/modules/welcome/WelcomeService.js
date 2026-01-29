/**
 * src/modules/welcome/WelcomeService.js
 * ようこそ機能のビジネスロジック層
 */

const repo = require('./WelcomeRepository');

class WelcomeService {
    /**
     * 設定取得
     */
    async getConfig(guildId) {
        return await repo.load(guildId);
    }

    /**
     * 挨拶チャンネルを更新
     */
    async updateChannel(guildId, channelId) {
        const config = await repo.load(guildId);
        config.channelId = channelId;
        await repo.save(guildId, config);
        return config;
    }

    /**
     * 挨拶メッセージを更新
     */
    async updateMessage(guildId, message) {
        const config = await repo.load(guildId);
        config.message = message;
        await repo.save(guildId, config);
        return config;
    }

    /**
     * ランダム画像設定を更新
     */
    async updateRandomImage(guildId, updates) {
        const config = await repo.load(guildId);
        config.randomImage = {
            ...config.randomImage,
            ...updates
        };
        await repo.save(guildId, config);
        return config;
    }

    /**
     * 送信用メッセージを組み立てる
     */
    formatMessage(template, member) {
        if (!template) return `${member} さん、いらっしゃいませ！`;

        let msg = template;

        // 置換処理
        msg = msg.replace(/\{user\}/g, String(member));
        msg = msg.replace(/\{username\}/g, member.displayName || member.user.username);
        msg = msg.replace(/\{server\}/g, member.guild.name);
        msg = msg.replace(/\{guild\}/g, member.guild.name); // 互換用エイリアス
        msg = msg.replace(/\{memberCount\}/g, String(member.guild.memberCount));

        return msg;
    }

    /**
     * ランダムな画像を1枚取得
     */
    pickRandomImage(config) {
        if (!config.randomImage?.enabled || !config.randomImage.images.length) {
            return null;
        }
        const images = config.randomImage.images;
        return images[Math.floor(Math.random() * images.length)];
    }
}

module.exports = new WelcomeService();
