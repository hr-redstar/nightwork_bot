// modules/syut/setting/settingActions.js
// ----------------------------------------------------
// 出退勤 設定アクション
// ----------------------------------------------------

const {
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');

async function handleSettingAction(interaction, action, subAction) {
    try {
        if (action === 'setting') {
            if (subAction === 'installCast') {
                const { showSetupMenus } = require('./config');
                return await showSetupMenus(interaction, 'cast');
            }
            if (subAction === 'installKuro') {
                const { showSetupMenus } = require('./config');
                return await showSetupMenus(interaction, 'black');
            }
            if (subAction === 'csv') {
                const { startCsvExport } = require('../utils/csv');
                return await startCsvExport(interaction);
            }
            if (subAction === 'approveRole') {
                const row = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('syut:setup:role')
                        .setPlaceholder('承認可能役職を選択')
                );

                return await interaction.reply({
                    content: '🕐 出退勤の承認権限を持つ役職を選択してください。',
                    components: [row],
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        if (action === 'setup') {
            if (subAction === 'role') {
                const roleId = interaction.values[0];
                const config = await getSyutConfig(interaction.guild.id);
                config.approveRoleId = roleId;
                await saveSyutConfig(interaction.guild.id, config);

                return await interaction.reply({
                    content: `✅ 承認役職を <@&${roleId}> に設定しました。`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    } catch (err) {
        logger.error('[Syut] handleSettingAction error:', err);
    }
}

module.exports = {
    handleSettingAction,
};
