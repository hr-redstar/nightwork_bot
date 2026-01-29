const { MessageFlags, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { SEKKYAKU_SETTING_PANEL_SCHEMA, SEKKYAKU_REPORT_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../SekkyakuService');

/**
 * 管理設定パネルを表示
 */
async function postSekkyakuSettingPanel(interaction) {
    const { config } = await service.prepareSettingData(interaction.guildId);

    const fields = SEKKYAKU_SETTING_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: f.key === 'channel' ? (config.targetChannelId ? `<#${config.targetChannelId}>` : f.fallback) : f.fallback
    }));

    const panel = buildPanel({
        title: SEKKYAKU_SETTING_PANEL_SCHEMA.title,
        description: SEKKYAKU_SETTING_PANEL_SCHEMA.description,
        color: SEKKYAKU_SETTING_PANEL_SCHEMA.color,
        fields,
        buttons: SEKKYAKU_SETTING_PANEL_SCHEMA.buttons
    });

    await interaction.editReply(panel);
}

/**
 * 実運用報告パネルを送信
 */
async function sendSekkyakuReportPanel(channel, storeName) {
    const panel = buildPanel({
        title: `${SEKKYAKU_REPORT_PANEL_SCHEMA.title} - ${storeName}`,
        description: '接客を開始・終了する際にボタンを押してください。\nこの内容は自動的に「店内状況」へ反映されます。',
        color: SEKKYAKU_REPORT_PANEL_SCHEMA.color,
        buttons: SEKKYAKU_REPORT_PANEL_SCHEMA.buttons.map(row =>
            row.map(btn => ({ ...btn, id: `${btn.id}:${storeName}` }))
        )
    });

    return await channel.send(panel);
}

module.exports = { postSekkyakuSettingPanel, sendSekkyakuReportPanel };
