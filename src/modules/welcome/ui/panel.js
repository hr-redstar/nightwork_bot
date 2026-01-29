/**
 * src/modules/welcome/ui/panel.js
 * ようこそ設定パネルの組み立て
 */

const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { WELCOME_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../WelcomeService');

/**
 * ようこそ設定パネルを表示
 */
async function sendWelcomeSettingPanel(interaction) {
    const guildId = interaction.guildId;
    const { config } = await service.prepareSettingData(guildId);

    const dataMap = {
        channel: config.channelId ? `<#${config.channelId}>` : null,
        message: config.message,
        images: (config.randomImage?.images?.length || 0) + '枚登録済み',
    };

    const fields = WELCOME_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: dataMap[f.key] || f.fallback
    }));

    const panel = buildPanel({
        title: WELCOME_PANEL_SCHEMA.title,
        description: WELCOME_PANEL_SCHEMA.description,
        color: WELCOME_PANEL_SCHEMA.color,
        fields: fields,
        buttons: WELCOME_PANEL_SCHEMA.buttons
    });

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(panel);
    } else {
        await interaction.reply(panel);
    }
}

module.exports = {
    sendWelcomeSettingPanel,
    buildWelcomePanel: sendWelcomeSettingPanel // Alias for RefreshPanelHandler
};
