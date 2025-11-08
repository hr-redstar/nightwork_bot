const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getKujiSettings, getPanelMessageId, savePanelMessageId } = require('./kujiStorage');
const dayjs = require('dayjs');

async function updatePanel(channel, guildId) {
    // 現在のくじ設定を取得
    const kujiList = await getKujiSettings(guildId);
    const kujiText = kujiList.length > 0 ? kujiList.join('\n') : '設定されていません';

    // Embed作成
    const embed = new EmbedBuilder()
        .setTitle('🎲 くじ引き設定一覧')
        .setDescription(kujiText)
        .setColor(0x5865F2) // Discord Blurple
        .setFooter({ text: `最終更新` })
        .setTimestamp();

    // ボタン作成
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('kuji_setting').setLabel('くじ引き設定').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('kuji_run').setLabel('くじ引き実行').setStyle(ButtonStyle.Success)
    );

    const messagePayload = { embeds: [embed], components: [row] };

    // 既存パネルメッセージを取得
    const panelMessageId = await getPanelMessageId(guildId);
    let message;

    if (panelMessageId) {
        try {
            message = await channel.messages.fetch(panelMessageId);
            await message.edit(messagePayload);
        } catch (err) {
            // メッセージが削除されていた場合、新規作成
            message = await channel.send(messagePayload);
            await savePanelMessageId(guildId, message.id);
        }
    } else {
        // 新規作成
        message = await channel.send(messagePayload);
        await savePanelMessageId(guildId, message.id);
    }

    return message;
}

module.exports = { updatePanel };
