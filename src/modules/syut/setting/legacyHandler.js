// modules/syut/setting/legacyHandler.js
// ----------------------------------------------------
// 旧仕様 (syut_*) インタラクションのハンドラー
// ----------------------------------------------------

const logger = require('../../../utils/logger');
const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');

async function handleLegacySyutInteraction(interaction) {
    const { customId } = interaction;

    if (interaction.isButton()) {
        if (customId === 'syut_csv_export') {
            const { startCsvExport } = require('../utils/csv');
            return await startCsvExport(interaction);
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (customId === 'syut_csv_store_select') {
            const { selectMonth } = require('../utils/csv');
            const store = interaction.values[0];
            return await selectMonth(interaction, store);
        }

        if (customId.startsWith('syut_select_store:')) {
            const { showChannelSelect } = require('./config');
            const [, kind] = customId.split(':');
            const storeName = interaction.values[0];
            return await showChannelSelect(interaction, kind, storeName);
        }

        if (customId.startsWith('syut_csv_month_select:')) {
            const { outputCsv } = require('../utils/csv');
            return await outputCsv(interaction);
        }

        // 他の syut_ シリーズ (role config系) も必要なら追加
        if (customId.startsWith('syut_pos_select_')) {
            const { showRoleSelectForPosition } = require('./roleConfig');
            const [, , , kind, store] = customId.split('_');
            const position = interaction.values[0];
            return await showRoleSelectForPosition(interaction, kind, store, position);
        }
        if (customId.startsWith('syut_role_select_')) {
            const { saveRoleLink } = require('./roleConfig');
            const [, , kind, store] = customId.split('_');
            const posMenu = interaction.message.components[0].components[0];
            const position = (posMenu.options.find(o => o.default)?.value) || posMenu.options[0].value;
            return await saveRoleLink(interaction, kind, store, position, interaction.values);
        }
    }

    if (interaction.isChannelSelectMenu()) {
        if (customId.startsWith('syut_select_channel:')) {
            const { handleSetupSubmit } = require('./config');
            const [, kind, storeName] = customId.split(':');
            const channelId = interaction.values[0];
            return await handleSetupSubmit(interaction, kind, storeName, channelId);
        }
    }
}

module.exports = {
    handleLegacySyutInteraction,
};
