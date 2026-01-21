// modules/chat_gpt/index.js
// ----------------------------------------------------
// ChatGPT機能のエントリーポイント
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * ChatGPT機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleChatGptInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId) return;

        // --- 管理設定系 (chat_gpt:*) ---
        if (customId.startsWith('chat_gpt:')) {
            const parts = customId.split(':');
            const action = parts[1];
            const subAction = parts[2];

            const { handleSettingAction } = require('./setting/settingActions');
            return await handleSettingAction(interaction, action, subAction);
        }

        // --- 実行系 (chatgpt_*) ---
        if (customId.startsWith('chatgpt_')) {
            const { handleInteraction } = require('./execute/handler');
            return await handleInteraction(interaction);
        }

    } catch (err) {
        logger.error('[ChatGPT] Error handling interaction', err);
    }
}

module.exports = {
    handleChatGptInteraction,
};
