const { MessageFlags, ButtonStyle, ChannelSelectMenuBuilder, ActionRowBuilder, ChannelType } = require('discord.js');
const { buildPanel } = require('../../../utils/ui/PanelBuilder');
const { HEARING_PANEL_SCHEMA } = require('./panelSchema');
const service = require('../HearingService');
const repo = require('../HearingRepository');
const logger = require('../../../utils/logger');

/**
 * ヒアリング設定パネルを送信・更新
 */
async function postHearingSettingPanel(interaction) {
    const guildId = interaction.guildId;
    const { config } = await service.prepareSettingData(guildId);

    const dataMap = {
        targetChannel: config.targetChannelId ? `<#${config.targetChannelId}>` : null,
        currentThread: config.currentThreadId ? `<#${config.currentThreadId}> (残り ${950 - (config.currentThreadCount || 0)}件)` : null,
    };

    const fields = HEARING_PANEL_SCHEMA.fields.map(f => ({
        name: f.name,
        value: dataMap[f.key] || f.fallback
    }));

    const panel = buildPanel({
        title: HEARING_PANEL_SCHEMA.title,
        description: HEARING_PANEL_SCHEMA.description,
        color: HEARING_PANEL_SCHEMA.color,
        fields: fields,
        buttons: HEARING_PANEL_SCHEMA.buttons
    });

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(panel);
    } else {
        await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    }
}

/**
 * 出力先チャンネル設定用のセレクターを表示
 */
async function sendTargetChannelSelect(interaction) {
    const select = new ChannelSelectMenuBuilder()
        .setCustomId('hearing:setting:select_channel')
        .setPlaceholder('ログを出力するチャンネルを選択してください')
        .addChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
        content: '📁 **ヒアリングログの出力先**を選択してください。\nここで指定したチャンネル内に、自動で管理用スレッドが作成されます。',
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

module.exports = { postHearingSettingPanel, sendTargetChannelSelect };
