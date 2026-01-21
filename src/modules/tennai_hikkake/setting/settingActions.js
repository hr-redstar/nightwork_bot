// modules/tennai_hikkake/setting/settingActions.js
// ----------------------------------------------------
// 店内状況・ひっかけ 設定アクション
// ----------------------------------------------------

const {
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { readHikkakeConfig, saveHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');

async function handleSettingAction(interaction, subAction) {
    try {
        if (subAction === 'install') {
            const { handleHikkakeSetup } = require('./hikkakeSetup');
            return await handleHikkakeSetup(interaction);
        }

        if (subAction === 'approveRole') {
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('tennai_hikkake:setup:role')
                    .setPlaceholder('承認可能役職を選択')
            );

            return await interaction.reply({
                content: '🏪 店内状況・ひっかけの承認権限を持つ役職を選択してください。',
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (err) {
        logger.error('[TennaiHikkake] handleSettingAction error:', err);
    }
}

async function handleSetupAction(interaction, subAction) {
    try {
        const guildId = interaction.guild.id;
        const config = await readHikkakeConfig(guildId);

        if (subAction === 'role') {
            const roleId = interaction.values[0];
            config.approveRoleId = roleId;
            await saveHikkakeConfig(guildId, config);

            return await interaction.reply({
                content: `✅ 承認役職を <@&${roleId}> に設定しました。`,
                flags: MessageFlags.Ephemeral,
            });
        }
    } catch (err) {
        logger.error('[TennaiHikkake] handleSetupAction error:', err);
    }
}

module.exports = {
    handleSettingAction,
    handleSetupAction,
};
