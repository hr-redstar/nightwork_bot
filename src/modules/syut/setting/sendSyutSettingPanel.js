// modules/syut/setting/sendSyutSettingPanel.js
// ----------------------------------------------------
// 出退勤 設定パネル（管理用）表示
// ----------------------------------------------------

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const logger = require('../../../utils/logger');
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
        let castText = '';
        if (config.castPanelList && Object.keys(config.castPanelList).length > 0) {
            castText = Object.entries(config.castPanelList)
                .map(([store, info]) => `・${store}：<#${info.channelId}>`)
                .join('\n');
        } else {
            castText = '未設置';
        }

        // 黒服パネルサマリー
        let kuroText = '';
        if (config.kurofukuPanelList && Object.keys(config.kurofukuPanelList).length > 0) {
            kuroText = Object.entries(config.kurofukuPanelList)
                .map(([store, info]) => `・${store}：<#${info.channelId}>`)
                .join('\n');
        } else {
            kuroText = '未設置';
        }

        const { approveRoleId } = config;
        const approveRoleText = approveRoleId
            ? `<@&${approveRoleId}>`
            : '未設定';

        // --------------------------------------------
        // Embed (Template based)
        // --------------------------------------------
        const embed = new EmbedBuilder()
            .setTitle('🕐 出退勤設定パネル')
            .setDescription('出退勤機能に関する設定を行うパネルです。')
            .addFields(
                {
                    name: '設置店舗 (キャスト)',
                    value: castText,
                    inline: false,
                },
                {
                    name: '設置店舗 (黒服)',
                    value: kuroText,
                    inline: false,
                },
                {
                    name: '出退勤承認役職',
                    value: `役職名：${approveRoleText}`,
                    inline: false,
                }
            )
            .setColor(getEmbedColor('syut', config))
            .setFooter(getBotFooter(interaction))
            .setTimestamp();

        // --------------------------------------------
        // Buttons
        // --------------------------------------------
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('syut:setting:installCast')
                .setLabel('キャストパネル設置')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('syut:setting:installKuro')
                .setLabel('黒服パネル設置')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('syut:setting:csv')
                .setLabel('CSV出力')
                .setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('syut:setting:approveRole')
                .setLabel('承認役職設定')
                .setStyle(ButtonStyle.Secondary)
        );

        const response = {
            embeds: [embed],
            components: [row, row2],
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    } catch (err) {
        logger.error('[Syut] sendSyutSettingPanel error:', err);
    }
}

module.exports = {
    sendSyutSettingPanel,
};
