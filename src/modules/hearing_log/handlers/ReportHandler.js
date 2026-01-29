const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const service = require('../HearingService');
const repo = require('../HearingRepository');
const Theme = require('../../../utils/ui/Theme');
const logger = require('../../../utils/logger');

/**
 * 報告用モーダルを表示
 */
async function showReportModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('hearing:report:modal_submit')
        .setTitle('ヒアリング報告');

    const dateInput = new TextInputBuilder()
        .setCustomId('date')
        .setLabel('日付')
        .setPlaceholder('例: 2024/01/28')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const numInput = new TextInputBuilder()
        .setCustomId('num')
        .setLabel('お客様人数')
        .setPlaceholder('例: 2名')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const castInput = new TextInputBuilder()
        .setCustomId('cast')
        .setLabel('担当キャスト')
        .setPlaceholder('名前を入力してください')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const contentInput = new TextInputBuilder()
        .setCustomId('content')
        .setLabel('報告内容')
        .setPlaceholder('詳細内容を入力してください')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(dateInput),
        new ActionRowBuilder().addComponents(numInput),
        new ActionRowBuilder().addComponents(castInput),
        new ActionRowBuilder().addComponents(contentInput)
    );

    await interaction.showModal(modal);
}

/**
 * モーダル送信時の処理
 */
async function handleModalSubmit(interaction) {
    const guildId = interaction.guildId;
    const date = interaction.fields.getTextInputValue('date');
    const num = interaction.fields.getTextInputValue('num');
    const cast = interaction.fields.getTextInputValue('cast');
    const content = interaction.fields.getTextInputValue('content');

    const config = await repo.getConfig(guildId);
    if (!config.targetChannelId) {
        return await interaction.reply({ content: '⚠️ ログ出力先チャンネルが設定されていません。管理者が `/設定ヒアリング` から設定してください。', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const channel = await interaction.guild.channels.fetch(config.targetChannelId);
        if (!channel || !channel.isTextBased()) throw new Error('出力チャンネルが見つかりません。');

        const threadId = await service.getOrCreateThread(channel, config);
        const thread = await channel.threads.fetch(threadId);

        const embed = new EmbedBuilder()
            .setTitle('👂 ヒアリング報告')
            .setColor(Theme.COLORS.BRAND)
            .addFields([
                { name: '📅 日付', value: date, inline: true },
                { name: '👥 人数', value: num, inline: true },
                { name: '👸 担当', value: cast, inline: true },
                { name: '📝 内容', value: content }
            ])
            .setFooter({ text: `報告者: ${interaction.user.tag}` })
            .setTimestamp();

        const logMsg = await thread.send({ embeds: [embed] });

        // インデックス保存 (検索用)
        await service.saveLogToIndex(guildId, { date, cast, content }, logMsg.id);

        await interaction.editReply({ content: `✅ ヒアリング報告を送信しました。 (スレッド: ${thread.name})` });

    } catch (err) {
        logger.error('[Hearing] 報告送信エラー:', err);
        await interaction.editReply({ content: '❌ 報告の送信中にエラーが発生しました。' });
    }
}

module.exports = { showReportModal, handleModalSubmit };
