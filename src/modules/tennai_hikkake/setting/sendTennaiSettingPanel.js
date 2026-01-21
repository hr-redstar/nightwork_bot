// modules/tennai_hikkake/setting/sendTennaiSettingPanel.js
// ----------------------------------------------------
// 店内状況・ひっかけ 設定パネル（管理用）表示
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
const { readHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');

async function sendTennaiSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得
        // --------------------------------------------
        const config = await readHikkakeConfig(guild.id);

        // ※ Tennai Hikkakeは店舗ごとに複数パネルがある可能性があるが、とりあえず基本を表示
        const panelChannelId = config?.panelChannelId;
        const approveRoleId = config?.approveRoleId;

        const panelChannelText = panelChannelId
            ? `<#${panelChannelId}>`
            : '未設定';

        const approveRoleText = approveRoleId
            ? `<@&${approveRoleId}>`
            : '未設定';

        // --------------------------------------------
        // Embed (Template based)
        // --------------------------------------------
        const embed = new EmbedBuilder()
            .setTitle('🏪 店内状況・ひっかけ設定パネル')
            .setDescription('店内状況・ひっかけ機能に関する設定を行うパネルです。')
            .addFields(
                {
                    name: '設置店舗',
                    value: `店舗名：${panelChannelText}`,
                    inline: false,
                },
                {
                    name: '機能名承認役職',
                    value: `役職名：${approveRoleText}`,
                    inline: false,
                }
            )
            .setColor(getEmbedColor('tennai_hikkake', config))
            .setFooter(getBotFooter(interaction))
            .setTimestamp();

        // --------------------------------------------
        // Buttons
        // --------------------------------------------
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('tennai_hikkake:setting:install')
                .setLabel('パネル設置')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('tennai_hikkake:setting:approveRole')
                .setLabel('承認役職設定')
                .setStyle(ButtonStyle.Secondary)
        );

        const response = {
            embeds: [embed],
            components: [row],
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    } catch (err) {
        logger.error('[TennaiHikkake] sendTennaiSettingPanel error:', err);
    }
}

module.exports = {
    sendTennaiSettingPanel,
};
