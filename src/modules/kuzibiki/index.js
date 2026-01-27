// modules/kuzibiki/index.js
// ----------------------------------------------------
// くじ引き機能のエントリーポイント
// customId: kuzibiki:{action}:{subAction} 形式でルーティング
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * くじ引き機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKuzibikiInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId || !customId.startsWith('kuzibiki:')) return;

        const parts = customId.split(':');
        const action = parts[1];     // setting, execute, modal
        const subAction = parts[2];  // install, channel, role, start, etc.

        logger.info(`[Kuzibiki] Handling interaction: ${customId}`);

        // --- 管理設定系 ---
        if (action === 'setting') {
            const { handleKuzibikiSetting } = require('./setting/settingActions');
            return await handleKuzibikiSetting(interaction, subAction);
        }

        // --- 実行系 ---
        if (action === 'execute') {
            const { handleKuzibikiExecute } = require('./execute/handler');
            return await handleKuzibikiExecute(interaction, subAction);
        }

        // --- モーダル送信 ---
        if (action === 'modal') {
            const { handleKuzibikiModal } = require('./setting/settingActions');
            return await handleKuzibikiModal(interaction, subAction);
        }

        // --- 未実装/不明なアクション ---
        logger.warn(`[Kuzibiki] Unknown action: ${customId}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ この操作はまだ実装されていません。',
                flags: MessageFlags.Ephemeral,
            });
        }

    } catch (err) {
        logger.error('[Kuzibiki] Error handling interaction', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ エラーが発生しました。',
                flags: MessageFlags.Ephemeral,
            }).catch(() => { });
        }
    }
}

module.exports = {
    // AppRouter Metadata
    prefixes: ['kuzibiki'],
    handleInteraction: handleKuzibikiInteraction,

    // Legacy
    handleKuzibikiInteraction,
};
