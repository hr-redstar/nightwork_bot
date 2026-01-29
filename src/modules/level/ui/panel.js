/**
 * src/modules/level/ui/panel.js
 */

const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { LEVEL_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../LevelService');

/**
 * レベル設定パネルを生成・送信
 */
async function sendLevelSettingPanel(interaction) {
    const guildId = interaction.guildId;
    const { config } = await service.prepareLevelData(guildId);

    const dataMap = {
        channel: config.channelId ? `<#${config.channelId}>` : null,
        message: config.message,
    };

    const embedFields = LEVEL_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: dataMap[f.key] || f.fallback
    }));

    const panel = buildPanel({
        title: LEVEL_PANEL_SCHEMA.title,
        description: LEVEL_PANEL_SCHEMA.description,
        color: LEVEL_PANEL_SCHEMA.color,
        fields: embedFields,
        buttons: LEVEL_PANEL_SCHEMA.buttons
    });

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(panel);
    } else {
        await interaction.reply(panel);
    }
}

module.exports = { sendLevelSettingPanel };
