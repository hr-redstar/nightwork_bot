// modules/chat_gpt/setting/sendChatGptSettingPanel.js
// ----------------------------------------------------
// ChatGPT 設定パネル（管理用）表示
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
const { IDS } = require('../execute/ids');

async function sendChatGptSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // Embed (Template based)
        // --------------------------------------------
        const embed = new EmbedBuilder()
            .setTitle('🤖 ChatGPT設定パネル')
            .setDescription('ChatGPT機能に関する設定を行うパネルです。')
            .addFields(
                {
                    name: '設置店舗',
                    value: '各店舗チャンネルに「本日のキャスト(GPT版)」ボタンが設置されます。',
                    inline: false,
                },
                {
                    name: '機能名承認役職',
                    value: '管理者のみ設定可能です。',
                    inline: false,
                }
            )
            .setColor(getEmbedColor('chat_gpt', {}))
            .setFooter(getBotFooter(interaction))
            .setTimestamp();

        // --------------------------------------------
        // Buttons
        // --------------------------------------------
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(IDS.BTN_TODAY_SETTING)
                .setLabel('今日のChatGPT設定')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(IDS.BTN_ANSWER_CHANNEL)
                .setLabel('回答チャンネル設定')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(IDS.BTN_CONVO_PROMPT_SETTING)
                .setLabel('プロンプト設定')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(IDS.BTN_USAGE)
                .setLabel('使用率確認')
                .setStyle(ButtonStyle.Success)
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
        logger.error('[ChatGPT] sendChatGptSettingPanel error:', err);
    }
}

module.exports = {
    sendChatGptSettingPanel,
};
