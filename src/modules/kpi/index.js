// modules/kpi/index.js
// ----------------------------------------------------
// KPI機能のエントリーポイント
// customId: kpi:{action}:{subAction} 形式でルーティング
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * KPI機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleKpiInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId || !customId.startsWith('kpi:')) return;

        const parts = customId.split(':');
        const action = parts[1];     // apply, modal, setup, setting
        const subAction = parts[2];  // start, install, channel, role, etc.

        logger.info(`[KPI] Handling interaction: ${customId}`);

        // --- 申請フロー ---
        if (action === 'apply') {
            const { handleApplyStart } = require('./panel/applyHandlers');
            if (subAction === 'start') {
                return await handleApplyStart(interaction);
            }
        }

        // --- モーダル送信 ---
        if (action === 'modal') {
            const { handleSubmitKpiApply } = require('./modal/modalHandlers');
            if (subAction === 'apply') {
                return await handleSubmitKpiApply(interaction);
            }
        }

        // --- 設定フロー (Setup) ---
        if (action === 'setup') {
            const { handleKpiSetup } = require('./setting/settingActions');
            return await handleKpiSetup(interaction, subAction);
        }

        // --- 設定パネル操作 (Setting) ---
        if (action === 'setting') {
            const { handleKpiSetting } = require('./setting/settingActions');
            return await handleKpiSetting(interaction, subAction);
        }

        // --- 未実装/不明なアクション ---
        logger.warn(`[KPI] Unknown action: ${customId}`);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ この操作はまだ実装されていません。',
                flags: MessageFlags.Ephemeral,
            });
        }

    } catch (err) {
        logger.error('[KPI] Error handling interaction', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ エラーが発生しました。',
                flags: MessageFlags.Ephemeral,
            }).catch(() => { });
        }
    }
}

module.exports = {
    handleKpiInteraction,
};
