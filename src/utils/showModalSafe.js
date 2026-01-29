/**
 * src/utils/showModalSafe.js
 * showModal 専用の安全ヘルパー
 * 
 * 💡 Platinum Rule:
 * - showModal は 3秒以内に呼ぶ
 * - defer / reply / update は一切しない
 * - 重い処理は modal submit 側で行う
 */

const logger = require('./logger');

/**
 * showModal を安全に呼び出す
 * @param {import('discord.js').Interaction} interaction 
 * @param {import('discord.js').ModalBuilder} modal 
 * @returns {Promise<boolean>} 成功したら true
 */
async function showModalSafe(interaction, modal) {
    // 既にACK済みならスキップ（ログのみ）
    if (interaction.deferred || interaction.replied) {
        logger.warn('[showModalSafe] Skipped: already acknowledged', {
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
        if (err.code === 10062) {
            logger.warn('[showModalSafe] ⏰ Timeout (3秒超過)', { customId: interaction.customId });
        } else if (err.code === 40060) {
            logger.warn('[showModalSafe] ⚠️ Already acknowledged', { customId: interaction.customId });
        } else {
            logger.error('[showModalSafe] Unexpected error:', err);
        }
        return false;
    }
}

module.exports = showModalSafe;
