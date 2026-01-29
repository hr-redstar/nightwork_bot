// modules/kuzibiki/execute/lotteryPanel.js
// ----------------------------------------------------
// 実際のくじ引きパネル表示・生成
// ----------------------------------------------------

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const Theme = require('../../../utils/ui/Theme');
const dayjs = require('dayjs');
const { readKujiConfig, saveKujiConfig } = require('../../../utils/kuzibiki/kuzibikiStorage');

/**
 * Embed + ボタンを生成
 */
function buildPanelEmbed(config) {
    const updatedTime = config.updatedAt
        ? dayjs(config.updatedAt).format('YYYY/MM/DD HH:mm')
        : '未設定';

    return new EmbedBuilder()
        .setColor(Theme.COLORS.BRAND)
        .setTitle('🎲 くじ引きパネル')
        .setDescription(
            `【現在の設定内容】\n更新時間：${updatedTime}\n\n${(config.settings && config.settings.length)
                ? config.settings.join('\n')
                : '（設定が登録されていません）'
            }\n\n下のボタンからくじ引きを実行できます。`
        )
        .setFooter({ text: 'くじ引きシステム' });
}

function buildPanelComponents() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kuzibiki:execute:config')
                .setLabel('くじ内容編集')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('kuzibiki:execute:start')
                .setLabel('くじを引く')
                .setStyle(ButtonStyle.Success)
        ),
    ];
}

/**
 * パネル更新または新規投稿
 */
async function upsertKuzibikiPanel(channel) {
    const guildId = channel.guild.id;
    const config = await readKujiConfig(guildId);

    const embed = buildPanelEmbed(config);
    const components = buildPanelComponents();

    if (config.panelMessageId) {
        try {
            const msg = await channel.messages.fetch(config.panelMessageId);
            await msg.edit({ embeds: [embed], components });
            return msg;
        } catch (e) {
            // ignore
        }
    }

    const panelMsg = await channel.send({ embeds: [embed], components });

    // 保存 (TODO: Use a proper store that doesn't overwrite everything)
    const next = {
        ...config,
        panelMessageId: panelMsg.id,
    };

    // Storage logic update
    const path = require('path');
    const { safeSaveJSON } = require('../../../utils/fileUtils');
    const baseDir = path.join(__dirname, '../../../../local_data/GCS');
    const filePath = path.join(baseDir, guildId, 'くじ引き', 'config.json');
    safeSaveJSON(filePath, next);

    return panelMsg;
}

module.exports = { upsertKuzibikiPanel };
