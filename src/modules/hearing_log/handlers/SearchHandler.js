const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const repo = require('../HearingRepository');
const logger = require('../../../utils/logger');

/**
 * 検索メニューを表示 (項目選択)
 */
async function showSearchMenu(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hearing:search:type:date').setLabel('📅 日付で検索').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hearing:search:type:cast').setLabel('👸 担当で検索').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hearing:search:type:content').setLabel('🔍 内容キーワードで検索').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: '🔍 **検索する項目**を選択してください。',
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

/**
 * キーワード入力モーダルを表示
 */
async function showSearchKeywordModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('hearing:search:modal:keyword')
        .setTitle('ヒアリングログ検索');

    const keywordInput = new TextInputBuilder()
        .setCustomId('keyword')
        .setLabel('キーワード')
        .setPlaceholder('検索したい単語を一部入力してください')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(keywordInput));

    await interaction.showModal(modal);
}

/**
 * 特定の項目(日付/キャスト等)のリストを生成して表示
 */
async function handleSearchTypeSelect(interaction, type) {
    const guildId = interaction.guildId;
    const index = await repo.getIndex(guildId);

    if (index.length === 0) {
        return await interaction.reply({ content: 'データがまだありません。', flags: MessageFlags.Ephemeral });
    }

    if (type === 'content') {
        return await showSearchKeywordModal(interaction);
    }

    // 重複を排除してリスト化 (新しいもの順)
    const items = [...new Set(index.map(entry => {
        if (type === 'date') return entry.date;
        if (type === 'cast') return entry.cast;
        return null;
    }))].filter(Boolean).reverse().slice(0, 25); // Discord上限

    if (items.length === 0) {
        return await interaction.reply({ content: '検索可能なデータが見つかりませんでした。', flags: MessageFlags.Ephemeral });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(`hearing:search:execute:${type}`)
        .setPlaceholder(`${type === 'date' ? '日付' : 'キャスト'}を選択してください`)
        .addOptions(items.map(item => ({ label: item, value: item })));

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
        content: `🔍 **${type === 'date' ? '日付' : '担当'}** を選択して結果を表示します。`,
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

/**
 * 検索実行と結果表示
 */
async function executeSearch(interaction, type, value) {
    const guildId = interaction.guildId;
    const index = await repo.getIndex(guildId);
    const config = await repo.getConfig(guildId);

    const normValue = value.toLowerCase();

    const results = index.filter(entry => {
        if (type === 'date') return entry.date === value;
        if (type === 'cast') return entry.cast === value;
        if (type === 'content') {
            return (entry.summary || '').toLowerCase().includes(normValue) ||
                (entry.date || '').toLowerCase().includes(normValue) ||
                (entry.cast || '').toLowerCase().includes(normValue);
        }
        return false;
    }).slice(-15); // 多すぎるとエラーになるので直近15件程度

    if (results.length === 0) {
        const msg = type === 'content' ? `キーワード「${value}」に一致するログは見つかりませんでした。` : '条件に一致するログが見つかりませんでした。';
        return await interaction.reply({ content: `⚠️ ${msg}`, flags: MessageFlags.Ephemeral });
    }

    const channelId = config.targetChannelId;
    const lines = results.reverse().map(r => {
        const url = `https://discord.com/channels/${guildId}/${channelId}/${r.id}`;
        return `・[${r.date}] **${r.cast}**: ${r.summary}... [リンク](${url})`;
    });

    const header = type === 'content' ? `🔎 キーワード 「${value}」 の検索結果` : `🔎 **${value}** の検索結果`;

    await interaction.reply({
        content: `${header} (${results.length}件):\n\n${lines.join('\n')}`,
        flags: MessageFlags.Ephemeral
    });
}

module.exports = { showSearchMenu, handleSearchTypeSelect, executeSearch };
