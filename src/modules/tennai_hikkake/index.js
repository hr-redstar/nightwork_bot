// modules/tennai_hikkake/index.js
// ----------------------------------------------------
// 店内状況・ひっかけ機能のエントリーポイント
// ----------------------------------------------------

const logger = require('../../utils/logger');
const { MessageFlags } = require('discord.js');

/**
 * 店内状況・ひっかけ機能のインタラクションハンドラー
 * @param {import('discord.js').Interaction} interaction
 */
async function handleTennaiHikkakeInteraction(interaction) {
    try {
        const { customId } = interaction;
        if (!customId) return;

        // --- 管理設定系 (tennai_hikkake:*) ---
        if (customId.startsWith('tennai_hikkake:')) {
            const parts = customId.split(':');
            const action = parts[1];
            const subAction = parts[2];

            const { handleSettingAction, handleSetupAction } = require('./setting/settingActions');
            if (action === 'setting') {
                return await handleSettingAction(interaction, subAction);
            }
            if (action === 'setup') {
                return await handleSetupAction(interaction, subAction);
            }
        }

        // --- 実行報告系 (hikkake_report_*) ---
        if (customId.startsWith('hikkake_report_')) {
            const { handleHikkakeReport, handleHikkakeReportModal } = require('./execute/hikkakeReport');
            if (interaction.isModalSubmit()) {
                return await handleHikkakeReportModal(interaction);
            }
            return await handleHikkakeReport(interaction);
        }

        // --- 旧セットアップ系 (互換性のため) ---
        if (customId === 'setup_hikkake_all' || customId === 'setup_hikkake_store' || customId === 'select_store_for_hikkake' || customId.startsWith('select_channel_for_hikkake_')) {
            const { handleHikkakeSetup, handleStoreSelectForHikkake, handleChannelSelectForHikkake } = require('./setting/hikkakeSetup');
            if (customId === 'select_store_for_hikkake') return await handleStoreSelectForHikkake(interaction);
            if (customId.startsWith('select_channel_for_hikkake_')) return await handleChannelSelectForHikkake(interaction);
            return await handleHikkakeSetup(interaction);
        }

        // --- 未実装/不明なアクション ---
        logger.warn(`[TennaiHikkake] Unknown action: ${customId}`);

    } catch (err) {
        logger.error('[TennaiHikkake] Error handling interaction', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⚠️ エラーが発生しました。',
                flags: MessageFlags.Ephemeral,
            }).catch(() => { });
        }
    }
}

module.exports = {
    handleTennaiHikkakeInteraction,
};
