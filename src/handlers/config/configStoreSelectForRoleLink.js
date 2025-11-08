/**
 * src/handlers/config/configStoreSelectForRoleLink.js
 * 店舗選択後、ロール選択メニューを表示
 */

const {
    RoleSelectMenuBuilder,
    ActionRowBuilder,
    MessageFlags,
} = require('discord.js');
const logger = require('../../utils/logger');

/**
 * Handles the store select for role link.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleStoreSelectForRoleLink(interaction) {
    try {
        const selectedStore = interaction.values?.[0];
        if (!selectedStore) {
            return await interaction.reply({
                content: '⚠️ 店舗が選択されていません。',
                flags: MessageFlags.Ephemeral,
            });
        }

        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId(`select_role_for_store_${selectedStore}`)
            .setPlaceholder('紐づける役職を複数選択できます')
            .setMinValues(1); // 複数選択を有効にする場合はsetMinValues/setMaxValuesを設定

        const row = new ActionRowBuilder().addComponents(roleMenu);

        await interaction.update({
            content: `🏪 **${selectedStore}** に紐づける役職を選択してください。`,
            components: [row],
        });
    } catch (err) {
        logger.error('❌ handleStoreSelectForRoleLink エラー:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `❌ エラー発生: ${err.message}`,
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}

module.exports = { handleStoreSelectForRoleLink };