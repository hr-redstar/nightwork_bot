// @ts-check
/**
 * src/modules/syut/handlers/SetupHandler.js
 * 出退勤パネル設置ハンドラー (Platinum Standard)
 */

const { MessageFlags } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const { showStoreSelectForPanel, handleStoreSelectedForPanel, handleChannelSelectedForPanel } = require('../../../events/panelFlowHelper');
const { buildPunchPanel } = require('../ui/panel');
const repo = require('../SyutRepository');

class SetupHandler extends BaseInteractionHandler {
    /**
     * @param {import('discord.js').Interaction} interaction 
     * @param {'cast'|'kuro'} type 
     */
    async startSetup(interaction, type) {
        await showStoreSelectForPanel(interaction, {
            customId: `syut:setup:select_store:${type}`,
            content: `🏬 **${type === 'cast' ? 'キャスト' : '黒服'}**用出退勤パネルを設置する店舗を選択してください。`
        });
    }

    /**
     * 店舗選択後 -> チャンネル選択
     */
    async handleStoreSelected(interaction) {
        const type = interaction.customId.split(':')[3];
        await handleStoreSelectedForPanel(interaction, {
            featureKey: `syut_${type}`,
            promptPrefix: `${type === 'cast' ? '👯' : '👔'} `
        });
    }

    /**
     * チャンネル選択後 -> 設置完了
     */
    async handleChannelSelected(interaction) {
        const type = interaction.customId.split(':')[3]; // syut_cast:[store] -> cast? no, handleChannelSelectedForPanel uses featureKey
        // Note: handleChannelSelectedForPanel sets customId to [featureKey]:select_channel:[store]
        // My featureKey was "syut_cast" etc.
        const actualType = type.startsWith('syut_') ? type.replace('syut_', '') : type;

        await handleChannelSelectedForPanel(interaction, {
            featureLabel: `${actualType === 'cast' ? 'キャスト' : '黒服'}出退勤パネル`,
            loadFeatureConfig: async (guildId) => await repo.getGlobalConfig(guildId),
            saveFeatureConfig: async (guildId, config) => await repo.saveGlobalConfig(guildId, config),
            configKeyMap: {
                messageId: `${actualType === 'cast' ? 'castPanelList' : 'kurofukuPanelList'}.[storeName].messageId`,
                channelId: `${actualType === 'cast' ? 'castPanelList' : 'kurofukuPanelList'}.[storeName].channelId`
            },
            postStorePanel: async (channel, storeName, guildId) => {
                const payload = await buildPunchPanel(guildId, storeName, actualType);
                const msg = await channel.send(payload);
                return msg;
            }
        });
    }
}

module.exports = new SetupHandler();
