// modules/kuzibiki/execute/handler.js
// ----------------------------------------------------
// くじ引き実行処理
// ----------------------------------------------------

const {
    StringSelectMenuBuilder,
    ActionRowBuilder,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const { readKujiConfig, saveKujiResult } = require('../../../utils/kuzibiki/kuzibikiStorage');

async function handleKuzibikiExecute(interaction, subAction) {
    if (subAction === 'start') {
        return await showCountSelect(interaction);
    }

    if (subAction === 'config') {
        const { openConfigModal } = require('../setting/settingActions');
        return await openConfigModal(interaction);
    }

    // --- 回数選択後の処理 (Select Menu) ---
    if (interaction.isStringSelectMenu() && subAction === 'selectCount') {
        const count = parseInt(interaction.values[0], 10);
        return await executeLottery(interaction, count);
    }
}

async function showCountSelect(interaction) {
    const guildId = interaction.guild.id;
    const config = await readKujiConfig(guildId);
    const settings = config.settings || [];

    if (settings.length === 0) {
        return await interaction.reply({
            content: '⚠️ くじ引き設定が空です。先に「くじ内容編集」から登録してください。',
            flags: MessageFlags.Ephemeral
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('kuzibiki:execute:selectCount')
        .setPlaceholder('くじ引き回数を選択（1～24）')
        .addOptions(
            Array.from({ length: 24 }, (_, i) => ({
                label: `${i + 1} 回`,
                value: String(i + 1),
            }))
        );

    await interaction.reply({
        content: '🎰 くじ引き回数を選んでください。',
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
    });
}

async function executeLottery(interaction, count) {
    const { guild, user, channel } = interaction;
    const config = await readKujiConfig(guild.id);
    const settings = config.settings || [];

    // 抽選 (重複あり手法)
    const results = [];
    for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * settings.length);
        results.push(settings[idx]);
    }

    // スレッド処理
    const threadName = 'くじ引き-結果';
    let thread = channel.threads.cache.find(t => t.name === threadName && !t.archived);
    if (!thread) {
        thread = await channel.threads.create({
            name: threadName,
            reason: 'くじ引き結果ログ',
        });
    }

    const now = dayjs();
    const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🎲 くじ引き結果')
        .addFields(
            { name: '設定内容', value: settings.join(', ').slice(0, 1024), inline: false },
            { name: '回数', value: `${count} 回`, inline: true },
            {
                name: '結果',
                value: results.map((r, idx) => `${idx + 1}️⃣ ${r}`).join('\n').slice(0, 1024),
                inline: false,
            },
        )
        .setFooter({ text: `実行者：${user.username} ｜ ${now.format('YYYY/MM/DD HH:mm')}` });

    const msg = await thread.send({ embeds: [embed] });

    // ログ保存
    saveKujiResult(guild.id, {
        timestamp: now.toISOString(),
        executedBy: { id: user.id, name: user.username },
        channelId: channel.id,
        threadId: thread.id,
        count,
        settings,
        results,
    });

    await interaction.update({
        content: `✅ くじ引きを実行しました。結果はスレッドに出力しました。`,
        components: []
    });
}

module.exports = {
    handleKuzibikiExecute
};
