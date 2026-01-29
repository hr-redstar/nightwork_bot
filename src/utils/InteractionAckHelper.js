/**
 * src/utils/InteractionAckHelper.js
 * 40060 (二重ACK) 防止用ユーティリティ
 * 
 * Discord.js の Interaction ACK 管理を安全に行うヘルパークラス
 */

const logger = require('./logger');

class InteractionAckHelper {
    /**
     * showModal を安全に呼び出す
     * @param {import('discord.js').Interaction} interaction 
     * @param {import('discord.js').ModalBuilder} modal 
     * @returns {Promise<boolean>} 成功したら true
     */
    static async safeShowModal(interaction, modal) {
        // ✅ Platinum Rule: showModal は未ACKの状態でのみ呼べる
        if (interaction.deferred || interaction.replied) {
            logger.warn('[InteractionAckHelper] showModal skipped: already acknowledged', {
                customId: interaction.customId,
                deferred: interaction.deferred,
                replied: interaction.replied
            });
            return false;
        }

        try {
            await interaction.showModal(modal);
            return true;
        } catch (err) {
            if (err.code === 40060) {
                logger.warn('[InteractionAckHelper] showModal failed: 40060 (already acknowledged)');
            } else {
                logger.error('[InteractionAckHelper] showModal failed:', err);
            }
            return false;
        }
    }

    /**
     * reply を安全に呼び出す
     * @param {import('discord.js').Interaction} interaction 
     * @param {object} payload 
     * @returns {Promise<boolean>} 成功したら true
     */
    static async safeReply(interaction, payload) {
        // 既にACK済みなら followUp を使う
        if (interaction.replied || interaction.deferred) {
            try {
                if (interaction.deferred) {
                    await interaction.editReply(payload);
                } else {
                    await interaction.followUp(payload);
                }
                return true;
            } catch (err) {
                logger.error('[InteractionAckHelper] editReply/followUp failed:', err);
                return false;
            }
        }

        // 未ACKなら reply
        try {
            await interaction.reply(payload);
            return true;
        } catch (err) {
            if (err.code === 40060) {
                logger.warn('[InteractionAckHelper] reply failed: 40060, trying followUp');
                try {
                    await interaction.followUp(payload);
                    return true;
                } catch (followUpErr) {
                    logger.error('[InteractionAckHelper] followUp also failed:', followUpErr);
                    return false;
                }
            } else if (err.code === 10062) {
                logger.warn('[InteractionAckHelper] reply failed: 10062 (token expired)');
                return false;
            } else {
                logger.error('[InteractionAckHelper] reply failed:', err);
                return false;
            }
        }
    }

    /**
     * deferReply を安全に呼び出す
     * @param {import('discord.js').Interaction} interaction 
     * @param {object} options 
     * @returns {Promise<boolean>} 成功したら true
     */
    static async safeDeferReply(interaction, options = {}) {
        // 既にACK済みならスキップ
        if (interaction.deferred || interaction.replied) {
            logger.debug('[InteractionAckHelper] deferReply skipped: already acknowledged');
            return false;
        }

        try {
            await interaction.deferReply(options);
            return true;
        } catch (err) {
            if (err.code === 40060) {
                logger.warn('[InteractionAckHelper] deferReply failed: 40060 (already acknowledged)');
            } else {
                logger.error('[InteractionAckHelper] deferReply failed:', err);
            }
            return false;
        }
    }

    /**
     * Interaction が ACK 可能かチェック
     * @param {import('discord.js').Interaction} interaction 
     * @returns {boolean}
     */
    static canAcknowledge(interaction) {
        return !interaction.deferred && !interaction.replied;
    }

    /**
     * Interaction の ACK 状態を取得
     * @param {import('discord.js').Interaction} interaction 
     * @returns {{deferred: boolean, replied: boolean, canAck: boolean}}
     */
    static getAckStatus(interaction) {
        return {
            deferred: interaction.deferred,
            replied: interaction.replied,
            canAck: !interaction.deferred && !interaction.replied
        };
    }
}

module.exports = InteractionAckHelper;
