// modules/syut/index.js
// ----------------------------------------------------
// 出退勤機能のエントリーポイント
// ----------------------------------------------------

const router = require('./router');
const logger = require('../../utils/logger');
const { handleInteractionError } = require('../../utils/errorHandlers');

/**
 * 出退勤機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleSyutInteraction(interaction) {
    try {
        if (!interaction.customId) return;

        const handled = await router.dispatch(interaction);
        if (!handled) {
            // Unhandled interactions might be legacy or unknown
            // logger.debug(`[Syut] Unhandled interaction: ${interaction.customId}`);
        }

    } catch (err) {
        await handleInteractionError(interaction, err);
    }
}

module.exports = {
    prefixes: ['syut', 'cast', 'kuro', 'role_select'],
    router
};
