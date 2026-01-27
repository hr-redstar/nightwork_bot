const service = require('../HikkakeService');
const { PanelBuilder } = require('../../../utils/ui/PanelBuilder');
const getBotFooter = require('../../common/utils/embed/getBotFooter');
const getEmbedColor = require('../../common/utils/embed/getEmbedColor');
const { handleInteractionError } = require('../../../utils/errorHandlers');

/**
 * 店内状況・ひっかけ設定パネルを送信
 * @param {import('discord.js').Interaction} interaction
 */
async function sendTennaiSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得 (Service経由)
        // --------------------------------------------
        const { config } = await service.prepareSettingData(guild.id);

        const panelChannelId = config?.panelChannelId;
        const approveRoleId = config?.approveRoleId;

        const panelChannelText = panelChannelId ? `<#${panelChannelId}>` : '未設定';
        const approveRoleText = approveRoleId ? `<@&${approveRoleId}>` : '未設定';

        // --------------------------------------------
        // Panel Construction (PanelBuilder)
        // --------------------------------------------
        const builder = new PanelBuilder()
            .setTitle('🏪 店内状況・ひっかけ設定パネル')
            .setDescription('店内状況・ひっかけ機能に関する設定を行うパネルです。')
            .setColor(getEmbedColor('tennai_hikkake', config))
            .addFields([
                { name: '設置店舗', value: `店舗名：${panelChannelText}`, inline: false },
                { name: '機能名承認役職', value: `役職名：${approveRoleText}`, inline: false }
            ])
            .setFooter(getBotFooter(interaction).text);

        builder.addButtons([
            { id: 'tennai_hikkake:setting:install', label: 'パネル設置', style: ButtonStyle.Primary },
            { id: 'tennai_hikkake:setting:approveRole', label: '承認役職設定', style: ButtonStyle.Secondary }
        ]);

        const payload = builder.toJSON();

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch (err) {
        logger.error('[TennaiHikkake] sendTennaiSettingPanel error:', err);
    }
}

module.exports = {
    sendTennaiSettingPanel,
};
