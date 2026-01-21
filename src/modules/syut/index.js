// modules/syut/index.js
// ----------------------------------------------------
// 出退勤機能のエントリーポイント
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * 出退勤機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleSyutInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId) return;

        // --- キャスト系 (cast_*) ---
        if (customId.startsWith('cast_')) {
            const { handleSyutCast } = require('./cast/handler');
            return await handleSyutCast(interaction);
        }

        // --- 黒服系 (kuro_*) ---
        if (customId.startsWith('kuro_')) {
            const { handleSyutKuro } = require('./kuro/handler');
            return await handleSyutKuro(interaction);
        }

        // --- 管理設定系 (syut:*) ---
        if (customId.startsWith('syut:')) {
            const parts = customId.split(':');
            const action = parts[1];
            const subAction = parts[2];

            const { handleSettingAction } = require('./setting/settingActions');
            return await handleSettingAction(interaction, action, subAction);
        }

        // --- 旧仕様互換 (syut_*) ---
        if (customId.startsWith('syut_')) {
            // 必要に応じて syutBotHandler の中身をここに移植
            const { handleLegacySyutInteraction } = require('./setting/legacyHandler');
            return await handleLegacySyutInteraction(interaction);
        }

    } catch (err) {
        logger.error('[Syut] Error handling interaction', err);
    }
}

module.exports = {
    handleSyutInteraction,
};
