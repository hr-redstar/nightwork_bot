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

        // --- 管理設定系 (config:*) ---
        if (customId.startsWith('config:')) {
            const parts = customId.split(':');
            const action = parts[1];
            const subAction = parts[2];

            const { handleSettingAction } = require('./setting/settingActions');
            return await handleSettingAction(interaction, action, subAction);
        }

        // --- 実行系 (config_*) ---
        if (customId.startsWith('config_')) {
            const { handleInteraction } = require('./execute/handler');
            return await handleInteraction(interaction);
        }

    } catch (err) {
        logger.error('[Config] Error handling interaction', err);
    }
}

module.exports = {
    handleConfigInteraction,
};
