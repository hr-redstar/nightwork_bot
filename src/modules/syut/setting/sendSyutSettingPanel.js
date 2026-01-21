// modules/syut/setting/sendSyutSettingPanel.js
const { ButtonStyle } = require('discord.js');
const logger = require('../../../utils/logger');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const getBotFooter = require('../../common/utils/embed/getBotFooter');
const getEmbedColor = require('../../common/utils/embed/getEmbedColor');
const { getSyutConfig } = require('../../../utils/syut/syutConfigManager');

async function sendSyutSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得
        // --------------------------------------------
        const config = await getSyutConfig(guild.id);

        // キャストパネルサマリー
        const castText = (config.castPanelList && Object.keys(config.castPanelList).length > 0)
            ? Object.entries(config.castPanelList).map(([store, info]) => `・${store}：<#${info.channelId}>`).join('\n')
            : '未設置';

        // 黒服パネルサマリー
        const kuroText = (config.kurofukuPanelList && Object.keys(config.kurofukuPanelList).length > 0)
            ? Object.entries(config.kurofukuPanelList).map(([store, info]) => `・${store}：<#${info.channelId}>`).join('\n')
            : '未設置';

        const { approveRoleId } = config;
        const approveRoleText = approveRoleId ? `<@&${approveRoleId}>` : '未設定';

        // --------------------------------------------
        // Panel Construction
        // --------------------------------------------
        const fields = [
            { name: '設置店舗 (キャスト)', value: castText, inline: false },
            { name: '設置店舗 (黒服)', value: kuroText, inline: false },
            { name: '出退勤承認役職', value: `役職名：${approveRoleText}`, inline: false }
        ];

        const buttons = [
            [
                { id: 'syut:setting:installCast', label: 'キャストパネル設置', style: ButtonStyle.Primary },
                { id: 'syut:setting:installKuro', label: '黒服パネル設置', style: ButtonStyle.Secondary },
                { id: 'syut:setting:csv', label: 'CSV出力', style: ButtonStyle.Success },
            ],
            [
                { id: 'syut:setting:approveRole', label: '承認役職設定', style: ButtonStyle.Secondary }
            ]
        ];

        const panel = buildPanel({
            title: '🕐 出退勤設定パネル',
            description: '出退勤機能に関する設定を行うパネルです。',
            fields: fields,
            buttons: buttons
        });

        // Apply dynamic styles
        panel.embeds[0]
            .setColor(getEmbedColor('syut', config))
            .setFooter(getBotFooter(interaction));

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(panel);
        } else {
            await interaction.reply(panel);
        }
    } catch (err) {
        logger.error('[Syut] sendSyutSettingPanel error:', err);
    }
}

module.exports = {
    sendSyutSettingPanel,
};
