// @ts-check
/**
 * src/modules/keihi/setting/handlers/SetPanelHandler.js
 * 「経費パネル設置」ボタン押下ハンドラー
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');
const { resolveStoreName } = require('../panel');
const { IDS } = require('../ids');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

class SetPanelHandler extends BaseInteractionHandler {
    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @returns {Promise<void>}
     */
    async handle(interaction) {
        const guildId = interaction.guild?.id;
        if (!guildId) {
            await interaction.editReply({
                content: 'ギルド情報が取得できませんでした。',
                components: [],
            });
            return;
        }

        const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
        const rawStores = storeRoleConfig?.stores ?? storeRoleConfig ?? {};
        /** @type {{ name: string }[]} */
        let stores = [];

        if (Array.isArray(rawStores)) {
            stores = rawStores.map((store, index) => {
                if (typeof store === 'string') return { name: store };
                const name = store?.name ?? store?.storeName ?? `店舗${index + 1}`;
                return { name: String(name) };
            });
        } else if (rawStores && typeof rawStores === 'object') {
            stores = Object.keys(rawStores).map((storeId) => ({
                name: String(resolveStoreName(storeRoleConfig, storeId) || storeId),
            }));
        }

        if (!stores.length) {
            await interaction.editReply({
                content: '店舗が登録されていません。先に`/設定`などで店舗を作成してください。',
                components: [],
            });
            return;
        }

        const options = stores.map((store) => ({
            label: store.name,
            value: store.name,
        }));

        const select = new StringSelectMenuBuilder()
            .setCustomId(IDS.SEL_STORE_FOR_PANEL)
            .setPlaceholder('経費パネルを設置する店舗を選択')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
            content: '経費パネルを設置する店舗を選択してください。',
            // @ts-ignore
            components: [row],
        });
    }
}

module.exports = new SetPanelHandler();
