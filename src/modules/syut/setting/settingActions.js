const {
    ActionRowBuilder,
    RoleSelectMenuBuilder,
    MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');
const { handleInteractionError } = require('../../../utils/errorHandlers');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');
const { reloadSyutCron } = require('../../../utils/syut/syutCron'); // 追加
const { IDS } = require('./ids');
const { showSetupMenus } = require('./config');
const { startCsvExport } = require('../utils/csv'); // Ensure path is correct, previously specific require inside function

async function handleInstallCastButton(interaction) {
    return await showSetupMenus(interaction, 'cast');
}

async function handleInstallKuroButton(interaction) {
    return await showSetupMenus(interaction, 'black');
}

async function handleCsvButton(interaction) {
    return await startCsvExport(interaction);
}

async function handleApproveRoleMenuButton(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId(IDS.ROLE_SET)
            .setPlaceholder('承認可能役職を選択')
    );

    return await interaction.reply({
        content: '🕐 出退勤の承認権限を持つ役職を選択してください。',
        components: [row],
        flags: MessageFlags.Ephemeral,
    });
}

async function handleRoleSetSelect(interaction) {
    try {
        const roleId = interaction.values[0];
        const config = await getSyutConfig(interaction.guild.id);
        config.approveRoleId = roleId;
        await saveSyutConfig(interaction.guild.id, config);

        // スケジュール再読み込み（設定変更を反映）
        reloadSyutCron(interaction.client).catch(err => logger.error('[Syut] reloadSyutCron error:', err));

        return await interaction.reply({
            content: `✅ 承認役職を <@&${roleId}> に設定しました。`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (err) {
        await handleInteractionError(interaction, err, { userMessage: 'エラーが発生しました' });
    }
}

// Legacy Dispatcher (if needed for old router logic, but we are replacing it)
// We will deprecate handleSettingAction

module.exports = {
    handleInstallCastButton,
    handleInstallKuroButton,
    handleCsvButton,
    handleApproveRoleMenuButton,
    handleRoleSetSelect
};
