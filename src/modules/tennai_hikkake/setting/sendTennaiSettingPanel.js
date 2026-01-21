// modules/tennai_hikkake/setting/sendTennaiSettingPanel.js
const { ButtonStyle } = require('discord.js');
const logger = require('../../../utils/logger');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const getBotFooter = require('../../common/utils/embed/getBotFooter');
const getEmbedColor = require('../../common/utils/embed/getEmbedColor');
const { readHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');

async function sendTennaiSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得
        // --------------------------------------------
        const config = await readHikkakeConfig(guild.id);

        const panelChannelId = config?.panelChannelId;
        const approveRoleId = config?.approveRoleId;

        const panelChannelText = panelChannelId ? `<#${panelChannelId}>` : '未設定';
        const approveRoleText = approveRoleId ? `<@&${approveRoleId}>` : '未設定';

        // --------------------------------------------
        // Panel Construction
        // --------------------------------------------
        const fields = [
            { name: '設置店舗', value: `店舗名：${panelChannelText}`, inline: false },
            { name: '機能名承認役職', value: `役職名：${approveRoleText}`, inline: false }
        ];

        const buttons = [[
            { id: 'tennai_hikkake:setting:install', label: 'パネル設置', style: ButtonStyle.Primary },
            { id: 'tennai_hikkake:setting:approveRole', label: '承認役職設定', style: ButtonStyle.Secondary }
        ]];

        const panel = buildPanel({
            title: '🏪 店内状況・ひっかけ設定パネル',
            description: '店内状況・ひっかけ機能に関する設定を行うパネルです。',
            fields: fields,
            buttons: buttons
        });

        // Apply dynamic styles
        panel.embeds[0]
            .setColor(getEmbedColor('tennai_hikkake', config))
            .setFooter(getBotFooter(interaction));

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(panel);
        } else {
            await interaction.reply(panel);
        }
    } catch (err) {
        logger.error('[TennaiHikkake] sendTennaiSettingPanel error:', err);
    }
}

module.exports = {
    sendTennaiSettingPanel,
};
