/**
 * src/modules/level/LevelService.js
 */

const repo = require('./LevelRepository');
const logger = require('../../utils/logger');

class LevelService {
    constructor() {
        // VC入室時間を管理するメモリキャッシュ (guildId-userId -> joinTime)
        this.vcSessions = new Map();
    }
    /**
     * 設定取得
     */
    async getConfig(guildId) {
        return await repo.loadConfig(guildId);
    }

    /**
     * チャンネル更新
     */
    async updateChannel(guildId, channelId) {
        const config = await repo.loadConfig(guildId);
        config.channelId = channelId;
        await repo.saveConfig(guildId, config);
        return config;
    }

    /**
     * メッセージ更新
     */
    async updateMessage(guildId, message) {
        const config = await repo.loadConfig(guildId);
        config.message = message;
        await repo.saveConfig(guildId, config);
        return config;
    }

    /**
     * XP設定更新
     */
    async updateXpConfig(guildId, type, updates) {
        const config = await repo.loadConfig(guildId);
        config.xp = config.xp || {};
        config.xp[type] = {
            ...(config.xp[type] || {}),
            ...updates
        };
        await repo.saveConfig(guildId, config);
        return config;
    }

    /**
     * XP加算ロジック (コア)
     * @returns {Promise<{oldXp, newXp, oldLevel, newLevel, leveledUp: boolean}>}
     */
    async addXp(guildId, userId, amount) {
        const data = await repo.loadUserData(guildId);
        const user = data[userId] || { xp: 0, level: 0 };

        const oldXp = user.xp;
        const oldLevel = user.level;

        user.xp += amount;

        // レベル計算公式 (例: 次のレベルには level * 100 XP 必要)
        // 簡易: level = floor(sqrt(xp / 50))
        const newLevel = Math.floor(Math.sqrt(user.xp / 50));
        const leveledUp = newLevel > oldLevel;

        user.level = newLevel;
        data[userId] = user;

        await repo.saveUserData(guildId, data);

        return { user, oldXp, newXp: user.xp, oldLevel, newLevel, leveledUp };
    }

    /**
     * チャットメッセージ受信時のXP処理
     */
    async handleChatMessage(message) {
        if (!message.guild || message.author.bot) return;

        const guildId = message.guild.id;
        const config = await this.getConfig(guildId);
        const xpCfg = config.xp?.chat;

        if (!xpCfg || xpCfg.xp <= 0) return;

        let amount = 0;
        if (xpCfg.type === 'length') {
            // 文字数に応じたXP (例: 20文字につき 5xp)
            // 実際は回数制限(クールダウン)等を設けるのが望ましいが、一旦シンプルに
            const length = message.content?.length || 0;
            if (length >= (xpCfg.length || 10)) {
                amount = xpCfg.xp;
            }
        } else {
            // 1メッセージにつき固定XP
            amount = xpCfg.xp;
        }

        if (amount > 0) {
            const result = await this.addXp(guildId, message.author.id, amount);
            if (result.leveledUp) {
                await this.sendLevelUpNotification(message.member, config, result.newLevel);
            }
        }
    }

    /**
     * VC状態更新時のXP処理
     */
    async handleVoiceStateUpdate(oldState, newState) {
        const userId = newState.id || oldState.id;
        const guildId = newState.guild.id || oldState.guild.id;
        const sessionKey = `${guildId}-${userId}`;

        // 1. 入室 (または他チャンネル移動)
        if (!oldState.channelId && newState.channelId) {
            this.vcSessions.set(sessionKey, Date.now());
            return;
        }

        // 2. 退室
        if (oldState.channelId && !newState.channelId) {
            const joinTime = this.vcSessions.get(sessionKey);
            if (!joinTime) return;

            this.vcSessions.delete(sessionKey);
            const durationMs = Date.now() - joinTime;
            const durationMinutes = Math.floor(durationMs / 60000);

            if (durationMinutes > 0) {
                await this.awardVoiceXp(guildId, userId, durationMinutes, newState.guild);
            }
        }
    }

    async awardVoiceXp(guildId, userId, minutes, guild) {
        const config = await this.getConfig(guildId);
        const vcXp = config.xp?.vc?.perMinute || 0;
        if (vcXp <= 0) return;

        const amount = minutes * vcXp;
        const result = await this.addXp(guildId, userId, amount);

        if (result.leveledUp) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                await this.sendLevelUpNotification(member, config, result.newLevel);
            }
        }
    }

    /**
     * レベルアップ通知を送信
     */
    async sendLevelUpNotification(member, config, newLevel) {
        if (!member || !config.channelId) return;

        const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const template = config.message || '✨ {user} さんのレベルが {level} に上がりました！';
        const text = template
            .replace(/\{user\}/g, `${member}`)
            .replace(/\{level\}/g, String(newLevel));

        await channel.send(text).catch(err => {
            logger.error(`[Level] Failed to send notification to ${channel.name}:`, err);
        });
    }
}

module.exports = new LevelService();
