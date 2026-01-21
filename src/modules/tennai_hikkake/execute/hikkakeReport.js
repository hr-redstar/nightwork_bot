// src/handlers/tennai_hikkake/hikkakeReport.js
const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} = require('discord.js');
const { saveCustomerLog, readTennaiData } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');
const { updateStorePanel } = require('./tennaiPanel');
const { getStoreList } = require('../../../utils/config/configAccessor');
const logger = require('../../../utils/logger'); // 仮のロガー
const dayjs = require('dayjs');

async function handleHikkakeReport(interaction) {
    const { customId } = interaction;

    // 店舗名をインタラクションから特定したいが、
    // パネル自体が特定店舗のチャンネルにあるはずなので、チャンネルIDから店舗を逆引きするか、
    // あるいはボタンIDに店舗名を埋め込むべきだった。
    // 現状の tennaiPanel.js では単純なIDしか振っていない。
    // しかし、updateStorePanel でチャンネルIDなどは config から引いている。
    // ここでは "どの店舗か" を知る必要がある。

    // 簡易的に、interaction.channelId から店舗を探すか、
    // またはインタラクション発生元のメッセージ（パネル）埋め込みタイトルから店舗名を取得する。
    const storeName = extractStoreNameFromEmbed(interaction.message);
    if (!storeName) {
        return interaction.reply({ content: '店舗情報の取得に失敗しました。', flags: MessageFlags.Ephemeral });
    }

    if (customId === 'hikkake_report_plan') {
        return showPlanModal(interaction, storeName);
    }
    if (customId === 'hikkake_report_success') {
        return showSuccessModal(interaction, storeName);
    }

    return interaction.reply({ content: 'この機能はまだ実装されていません。', flags: MessageFlags.Ephemeral });
}

function extractStoreNameFromEmbed(message) {
    if (!message || !message.embeds || message.embeds.length === 0) return null;
    const title = message.embeds[0].title;
    // "🏬 店舗: 大阪店" のような形式
    if (title && title.includes('店舗: ')) {
        return title.split('店舗: ')[1].trim();
    }
    return null;
}

async function showPlanModal(interaction, storeName) {
    const modal = new ModalBuilder()
        .setCustomId(`hikkake_report_modal_plan::${storeName}`)
        .setTitle('🐟 ひっかけ予定入力');

    const groupInput = new TextInputBuilder()
        .setCustomId('group_count')
        .setLabel('組数')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(true);

    const numInput = new TextInputBuilder()
        .setCustomId('customer_count')
        .setLabel('人数')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('2')
        .setRequired(true);

    // const planInput ... （仕様に合わせて項目追加）

    modal.addComponents(
        new ActionRowBuilder().addComponents(groupInput),
        new ActionRowBuilder().addComponents(numInput)
    );

    await interaction.showModal(modal);
}

async function showSuccessModal(interaction, storeName) {
    const modal = new ModalBuilder()
        .setCustomId(`hikkake_report_modal_success::${storeName}`)
        .setTitle('🎣 ひっかけ確定入力');

    const groupInput = new TextInputBuilder()
        .setCustomId('group_count')
        .setLabel('組数')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('1')
        .setRequired(true);

    const numInput = new TextInputBuilder()
        .setCustomId('customer_count')
        .setLabel('人数')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('2')
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(groupInput),
        new ActionRowBuilder().addComponents(numInput)
    );

    await interaction.showModal(modal);
}

async function handleHikkakeReportModal(interaction) {
    const { customId, fields, guild, member } = interaction;

    if (!customId.startsWith('hikkake_report_modal_')) return;

    const parts = customId.split('::');
    const type = parts[0].replace('hikkake_report_modal_', ''); // plan or success
    const storeName = parts[1];

    const group = fields.getTextInputValue('group_count');
    const num = parseInt(fields.getTextInputValue('customer_count'), 10) || 0;

    const logEntry = {
        type: type === 'plan' ? '予定' : '確定',
        group: group,
        num: num,
        enterTime: dayjs().format('HH:mm'),
        inputUser: member.displayName,
        store: storeName,
        castList: [], // 仮
        plan: '',     // 仮
    };

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // データ保存
    // 既存データを読み込んで追記
    const guildId = guild.id;
    let logs = await readTennaiData(guildId, storeName, '接客ログ.json').catch(() => []);
    if (!Array.isArray(logs)) logs = [];

    logs.push(logEntry);
    await saveCustomerLog(guildId, storeName, logs);

    // パネル更新
    const attendance = []; // 仮: 出退勤データ（連携は後で実装）

    const { readHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');
    const config = await readHikkakeConfig(guildId);
    const storePanelConfig = config.panels || {};

    try {
        const { updateStorePanel } = require('./tennaiPanel');
        await updateStorePanel(interaction.client, storeName, attendance, logs, storePanelConfig);
    } catch (err) {
        console.error('パネル更新エラー:', err);
    }

    await interaction.editReply({ content: `✅ ${type === 'plan' ? '予定' : '確定'}を登録しました。` });
}

module.exports = {
    handleHikkakeReport,
    handleHikkakeReportModal,
};
