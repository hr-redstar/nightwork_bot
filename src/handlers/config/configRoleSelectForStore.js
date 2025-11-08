/**
 * src/handlers/config/configRoleSelectForStore.js
 * Handles the role select for store.
 */

const { MessageFlags } = require('discord.js');
const { updateLink } = require('../../utils/config/storeRoleConfigManager');
const logger = require('../../utils/logger');

/**
 * Handles the role select for store.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleRoleSelectForStore(interaction) {
    try {
        const selectedRoles = interaction.values; // 複数選択を考慮
        const storeName = interaction.customId.replace('select_role_for_store_', '');
        const guildId = interaction.guild.id;

        // 新しいマネージャーを使って紐づけを更新
        await updateLink(guildId, 'link_store_role', storeName, selectedRoles);

        await interaction.update({
            content: `✅ 店舗 **${storeName}** に選択されたロールを紐づけました。`,
            components: [],
        });
    } catch (err) {
        logger.error('❌ handleRoleSelectForStore エラー:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ 役職紐づけ保存中にエラーが発生しました。',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
}


module.exports = {
    handleRoleSelectForStore,
};