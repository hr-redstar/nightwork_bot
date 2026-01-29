// @ts-check
/**
 * src/modules/keihi/setting/handlers/ExportCsvHandler.js
 * 経費「CSV発行」ボタン初期化
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');
const { IDS } = require('../ids');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

class ExportCsvHandler extends BaseInteractionHandler {
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

        const storeConfig = await loadStoreRoleConfig(guildId);
        const storeOptions = this._buildStoreOptions(storeConfig);

        if (!storeOptions.length) {
            await interaction.editReply({
                content: '店舗設定がまだありません。先に「店舗_役職_ロール」を設定してください。',
                components: [],
            });
            return;
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(IDS.SELECT_STORE_FOR_CSV)
            .setPlaceholder('CSVを発行する店舗を選択してください')
            .addOptions(storeOptions.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
            content: '経費CSVを発行する店舗を選択してください。',
            // @ts-ignore
            components: [row],
        });
    }

    _buildStoreOptions(storeConfig) {
        if (Array.isArray(storeConfig?.stores)) {
            return storeConfig.stores.map((store, index) => {
                const name = (store && (store.name ?? store.storeName)) || (typeof store === 'string' ? store : `店舗${index + 1}`);
                return { label: name, value: name };
            });
        }
        return [];
    }
}

module.exports = new ExportCsvHandler();
