// @ts-check
/**
 * src/modules/hearing_log/HearingService.js
 * ヒアリングログのビジネスロジック (Platinum 基準)
 */

const StoreServiceBase = require('../common/StoreServiceBase');
const repo = require('./HearingRepository');
const logger = require('../../utils/logger');

class HearingService extends StoreServiceBase {
    /**
     * 設定パネル用のデータを準備
     * @param {string} guildId 
     */
    async prepareSettingData(guildId) {
        const config = await repo.getConfig(guildId);
        return { config };
    }

    /**
     * ログ出力先スレッドを取得または新規作成 (950件上限対応)
     * @param {import('discord.js').TextChannel} channel 
     * @param {any} config 
     */
    async getOrCreateThread(channel, config) {
        const MAX_COUNT = 950;
        let threadId = config.currentThreadId;
        let count = config.currentThreadCount || 0;
        let suffix = config.threadSuffix || 1;

        // スレッドが存在しない、または上限に達した場合は新規作成
        if (!threadId || count >= MAX_COUNT) {
            const threadName = `ヒアリング報告-${suffix}`;
            const thread = await channel.threads.create({
                name: threadName,
                autoArchiveDuration: 10080, // 1週間
                reason: 'ヒアリングログの自動スケーリング'
            });

            threadId = thread.id;
            count = 0;
            suffix++;

            // 設定更新
            config.currentThreadId = threadId;
            config.currentThreadCount = count;
            config.threadSuffix = suffix;
            await repo.saveConfig(channel.guildId, config);

            logger.info(`[Hearing] 新規スレッド作成: ${threadName}`);
        }

        return threadId;
    }

    /**
     * ログを保存しインデックスを更新
     * @param {string} guildId 
     * @param {any} logData 
     * @param {string} messageId 
     */
    async saveLogToIndex(guildId, logData, messageId) {
        const index = await repo.getIndex(guildId);
        index.push({
            id: messageId,
            date: logData.date,
            cast: logData.cast,
            summary: logData.content.substring(0, 50),
            timestamp: new Date().toISOString()
        });

        // 直近1000件程度に制限（必要なら）
        if (index.length > 5000) index.shift();

        await repo.saveIndex(guildId, index);

        // カウント更新
        const config = await repo.getConfig(guildId);
        config.currentThreadCount = (config.currentThreadCount || 0) + 1;
        await repo.saveConfig(guildId, config);
    }
}

module.exports = new HearingService();
