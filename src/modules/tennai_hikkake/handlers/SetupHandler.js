// @ts-check
/**
 * src/modules/tennai_hikkake/handlers/SetupHandler.js
 * 店内状況・パネルセットアップハンドラー (Platinum Standard)
 */

const { MessageFlags, ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const { showStoreSelectForPanel, handleStoreSelectedForPanel, handleChannelSelectedForPanel } = require('../../../events/panelFlowHelper');
const repo = require('../HikkakeRepository');
const { createDynamicTennaiPanel } = require('../ui/tennaiPanel');
const logger = require('../../../utils/logger');

class SetupHandler extends BaseInteractionHandler {
    /**
     * セットアップ開始 (店舗選択)
     */
    async startSetup(interaction) {
        await showStoreSelectForPanel(interaction, {
            customId: 'tennai_hikkake:setup:select_store',
            content: '🏬 店内状況・ひっかけ一覧を設置する店舗を選択してください。'
        });
    }

    /**
     * 店舗選択後 -> チャンネル選択
     */
    async handleStoreSelected(interaction) {
        await handleStoreSelectedForPanel(interaction, {
            featureKey: 'tennai_hikkake',
            promptPrefix: '🏢 '
        });
    }

    /**
     * チャンネル選択後 -> 設置完了
     */
    async handleChannelSelected(interaction) {
        await handleChannelSelectedForPanel(interaction, {
            featureLabel: '店内状況パネル',
            loadFeatureConfig: async (guildId) => await repo.getGlobalConfig(guildId),
            saveFeatureConfig: async (guildId, config) => await repo.saveGlobalConfig(guildId, config),
            postStorePanel: async (channel, storeName, guildId) => {
                const payload = createDynamicTennaiPanel(storeName, [], []);
                const msg = await channel.send(payload);
                return msg;
            }
        });
    }

    /**
     * 承認役職設定メニューを表示
     */
    async showApproveRoleSelect(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId('tennai_hikkake:setup:role_submit')
                .setPlaceholder('承認可能な役職を選択してください')
        );

        await interaction.reply({
            content: '👔 店内状況・ひっかけの**承認権限を持つ役職**を選択してください。',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * 承認役職設定の保存
     */
    async handleRoleSubmit(interaction) {
        const roleId = interaction.values[0];
        const config = await repo.getGlobalConfig(interaction.guildId);
        config.approveRoleId = roleId;
        await repo.saveGlobalConfig(interaction.guildId, config);

        await interaction.reply({
            content: `✅ 承認役職を <@&${roleId}> に設定しました。`,
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = new SetupHandler();
