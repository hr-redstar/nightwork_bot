// src/handlers/keihiBotHandler.js
// ----------------------------------------------------
// 経費機能 全体エントリ
//   - 設定パネル系（/設定経費 ボタン/セレクト）
//   - 申請パネル系（店舗ごとの経費申請）
// ----------------------------------------------------

const { handleKeihiSettingInteraction } = require('./keihi/setting');
const { handleKeihiRequestInteraction } = require('./keihi/request');
const logger = require("../utils/logger");

/**
 * interactionCreate から呼ぶメインハンドラ
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
    if (!interaction.customId) return;

    const id = interaction.customId;

    // 設定パネル系（/設定経費）
    if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isChannelSelectMenu() ||
        interaction.isRoleSelectMenu()
    ) {
        if (id.startsWith('keihi_config:')) {
            return handleKeihiSettingInteraction(interaction);
        }
    }

    // 申請パネル系（店舗ごとの経費申請）
    if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
    ) {
        if (
            id.startsWith('keihi_item:') ||
            id.startsWith('keihi_view_role_config:') ||
            id.startsWith('keihi_request_request_item:') || // ★ この行を追加
            id.startsWith('keihi_request_role_config:') ||
            id.startsWith('keihi_request:') ||
            id.startsWith('keihi_approve:') ||
            id.startsWith('keihi_modify:') ||
            id.startsWith('keihi_delete:') ||
            id.startsWith('keihi_item_config_modal:') ||
            id.startsWith('keihi_request_modal:') ||
            id.startsWith('keihi_modify_modal:')
        ) {
            return handleKeihiRequestInteraction(interaction);
        }
    }
}

module.exports = {
  handleInteraction,
};
