// modules/config/index.js
// ----------------------------------------------------
// 基本設定機能のエントリーポイント
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * 基本設定機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleConfigInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId) return;

        // config系すべて
        if (customId.startsWith('config') || customId.startsWith('config_') || customId.startsWith('config:')) {
            const { handleInteraction } = require('./execute/handler');
            return await handleInteraction(interaction);
        }

    } catch (err) {
        logger.error('[Config] Error handling interaction', err);
    }
}

module.exports = {
    // AppRouter Metadata
    prefixes: ['config'],
    handleInteraction: handleConfigInteraction,

    // Legacy
    handleConfigInteraction,
};
