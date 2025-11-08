/**
 * src/handlers/config/configStoreRoleLink.js
 * Handles the store role link.
 */

const {
    StringSelectMenuBuilder,
    ActionRowBuilder,
    MessageFlags,
} = require('discord.js');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const logger = require('../../utils/logger');

/**
 * Handles the store role link.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleStoreRoleLink(interaction) {
    try {
        const config = await loadStoreRoleConfig(interaction.guild.id);
        const stores = config?.stores || [];

        if (!stores.length) {
            return interaction.reply({
                content: '⚠️ 店舗がまだ登録されていません。',
                flags: MessageFlags.Ephemeral,
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_store_for_role_link')
            .setPlaceholder('店舗を選択してください')
            .addOptions(stores.map((s) => ({ label: s, value: s })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({
            content: '🏪 ロールを紐づけたい店舗を選んでください。',
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
    } catch (err) {
        logger.error('❌ handleStoreRoleLink エラー:', err);
    }
}

module.exports = {
    handleStoreRoleLink,
};