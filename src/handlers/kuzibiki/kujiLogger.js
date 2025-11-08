const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../utils/config/gcsConfigManager');

/**
 * くじ引き設定の変更をログに記録する
 * @param {import('discord.js').Interaction} interaction
 * @param {string[]} oldKuji
 * @param {string[]} newKuji
 */
async function logKujiChange(interaction, oldKuji, newKuji) {
    const config = await getGuildConfig(interaction.guildId);
    if (!config?.adminLogChannel) return;

    const channel = interaction.guild.channels.cache.get(config.adminLogChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('📝 くじ引き設定変更ログ')
        .setDescription(`くじ引き設定が <#${interaction.channel.id}> で変更されました。`)
        .setColor(0xFFA500) // Orange
        .addFields(
            { name: '実行者', value: `${interaction.user}`, inline: true },
            { name: '変更前', value: oldKuji.length > 0 ? oldKuji.join('\n') : 'なし', inline: false },
            { name: '変更後', value: newKuji.length > 0 ? newKuji.join('\n') : 'なし', inline: false }
        )
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

/**
 * くじ引きの実行結果をログに記録する
 * @param {import('discord.js').Interaction} interaction
 * @param {string[]} kujiList
 * @param {number} count
 * @param {string[]} result
 */
async function logKujiResult(interaction, kujiList, count, result) {
    // This function is now more for creating the result message content.
    // The thread creation will be handled in the run handler.
    return `**くじ引き設定:**\n${kujiList.join(' / ')}\n\n**くじ引き回数:** ${count}回\n**結果:**\n${result.join(', ')}\n\n**実行者:** ${interaction.user}`;
}

module.exports = { logKujiChange, logKujiResult };