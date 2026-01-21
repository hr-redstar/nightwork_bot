// modules/kuzibiki/setting/sendKuzibikiSettingPanel.js
// ----------------------------------------------------
// くじ引き 設定パネル（管理用）表示
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
const { readKujiConfig } = require('../../../utils/kuzibiki/kuzibikiStorage');

async function sendKuzibikiSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得
        // --------------------------------------------
        const config = await readKujiConfig(guild.id);

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
            .setTitle('🎲 くじ引き設定パネル')
            .setDescription('くじ引き機能に関する設定を行うパネルです。')
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
            .setColor(getEmbedColor('kuzibiki', config))
            .setFooter(getBotFooter(interaction))
            .setTimestamp();

        // --------------------------------------------
        // Buttons
        // --------------------------------------------
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kuzibiki:setting:install')
                .setLabel('くじ引き設置')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('kuzibiki:setting:approveRole')
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
        logger.error('[Kuzibiki] sendKuzibikiSettingPanel error:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ くじ引き設定パネルの表示に失敗しました。',
                ephemeral: true,
            });
        }
    }
}

module.exports = {
    sendKuzibikiSettingPanel,
};
