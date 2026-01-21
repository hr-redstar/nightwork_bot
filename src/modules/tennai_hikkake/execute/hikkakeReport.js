// src/handlers/tennai_hikkake/hikkakeReport.js
const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    StringSelectMenuBuilder,
} = require('discord.js');
const { saveCustomerLog, readTennaiData, readHikkakeConfig } = require('../../../utils/tennai_hikkake/gcsTennaiHikkake');
const { updateStorePanel } = require('./tennaiPanel');
const { getDailySyuttaikin } = require('../../../utils/syut/syutConfigManager');
const logger = require('../../../utils/logger');
const dayjs = require('dayjs');

async function handleHikkakeReport(interaction) {
    const { customId } = interaction;
    let storeName = null;
    let action = null;

    // ID形式: hikkake_report_{action}:{storeName}
    if (customId.includes(':')) {
        const parts = customId.split(':');
        // parts[0] = hikkake_report_plan, etc.
        action = parts[0].replace('hikkake_report_', '');
        storeName = parts[1];
    } else {
        // フォールバック (旧形式)
        storeName = extractStoreNameFromEmbed(interaction.message);
        action = customId.replace('hikkake_report_', '');
    }

    if (!storeName) {
        return interaction.reply({ content: '店舗情報の取得に失敗しました。', flags: MessageFlags.Ephemeral });
    }

    if (action === 'plan') {
        return showReportModal(interaction, storeName, 'plan', '🐟 ひっかけ予定入力');
    }
    if (action === 'success') {
        return showReportModal(interaction, storeName, 'success', '🎣 ひっかけ確定入力');
    }
    if (action === 'failed') {
        return showReportModal(interaction, storeName, 'failed', '💨 ひっかけ失敗入力');
    }
    if (action === 'edit') {
        return showEditSelect(interaction, storeName);
    }

    return interaction.reply({ content: 'この機能はまだ実装されていません。', flags: MessageFlags.Ephemeral });
}

function extractStoreNameFromEmbed(message) {
    if (!message || !message.embeds || message.embeds.length === 0) return null;
    const title = message.embeds[0].title;
    if (title && title.includes('店舗: ')) {
        return title.split('店舗: ')[1].trim();
    }
    return null;
}

// 共通モーダル表示
async function showReportModal(interaction, storeName, type, title) {
    const modal = new ModalBuilder()
        .setCustomId(`hikkake_report_modal_${type}:${storeName}`)
        .setTitle(title);

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

// 編集用選択メニュー表示
async function showEditSelect(interaction, storeName) {
    const guildId = interaction.guild.id;
    const logs = await readTennaiData(guildId, storeName, '接客ログ.json').catch(() => []) || [];

    // 直近10件を表示
    const recentLogs = logs.slice(-10).reverse();

    if (recentLogs.length === 0) {
        return interaction.reply({ content: '編集可能な履歴がありません。', flags: MessageFlags.Ephemeral });
    }

    const options = recentLogs.map((log, index) => {
        const time = log.enterTime || '??:??';
        const typeIcon = log.type === '予定' ? '🐟' : log.type === '確定' ? '🎣' : '💨';
        // reverseしているので、元のインデックスを計算する必要があるが、
        // 簡易的に "タイムスタンプ+内容" で特定するか、あるいは配列のインデックスを保持するか。
        // ここでは便宜上、ログオブジェクトの内容をJSON化してValueにする（長さに注意）
        // 安全策: 実際のインデックス（logs配列内の）を使う。
        // slice(-10) なので、 logs.length - 1 - index が元のインデックス。
        const originalIndex = logs.length - 1 - index;

        return {
            label: `${time} ${log.type} ${log.num}名 (入力:${log.inputUser})`,
            description: `組:${log.group} 担当:${(log.castList || []).join(',')}`,
            value: `edit_index:${originalIndex}`,
            emoji: typeIcon
        };
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId(`hikkake_edit_select:${storeName}`)
        .setPlaceholder('編集する履歴を選択してください')
        .addOptions(options);

    return interaction.reply({
        content: '編集する項目を選択してください（直近10件）',
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral
    });
}

// 編集選択後のハンドラ (index.js から呼ばれる想定、あるいはここで分岐するか)
// 現状の index.js のルーティングだと、hikkake_report_edit_select みたいなのが必要だが、
// ここでは割愛し、handleHikkakeReportModalに集約する形にするか、別途関数をexportするか。
// index.jsのルーティング修正が必要。
// -> hikkake_edit_select は "hikkake_report_" で始まってないが、
// index.jsで "tennai_hikkake:" 系に入れるか、別途処理するか。
// ひとまず module.exports に handleHikkakeEditSelect を追加し、index.js で呼ぶ。

async function handleHikkakeEditSelect(interaction) {
    const { customId, values } = interaction;
    const storeName = customId.split(':')[1];
    const index = parseInt(values[0].split(':')[1], 10);

    const guildId = interaction.guild.id;
    const logs = await readTennaiData(guildId, storeName, '接客ログ.json').catch(() => []) || [];
    const targetLog = logs[index];

    if (!targetLog) {
        return interaction.update({ content: '指定された履歴が見つかりません。', components: [] });
    }

    // 編集用モーダルを表示
    const modal = new ModalBuilder()
        .setCustomId(`hikkake_report_modal_edit:${storeName}:${index}`)
        .setTitle('✏️ 履歴編集');

    const groupInput = new TextInputBuilder()
        .setCustomId('group_count')
        .setLabel('組数')
        .setStyle(TextInputStyle.Short)
        .setValue(String(targetLog.group))
        .setRequired(true);

    const numInput = new TextInputBuilder()
        .setCustomId('customer_count')
        .setLabel('人数')
        .setStyle(TextInputStyle.Short)
        .setValue(String(targetLog.num))
        .setRequired(true);

    // type も編集させたい場合はセレクトが必要だがモーダルでは無理。
    // ここでは数値のみ修正とする。

    modal.addComponents(
        new ActionRowBuilder().addComponents(groupInput),
        new ActionRowBuilder().addComponents(numInput)
    );

    await interaction.showModal(modal);
}

async function handleHikkakeReportModal(interaction) {
    const { customId, fields, guild, member } = interaction;
    // hikkake_report_modal_{type}:{storeName} or :{index}

    if (!customId.startsWith('hikkake_report_modal_')) return;

    const body = customId.replace('hikkake_report_modal_', '');
    const parts = body.split(':');
    const type = parts[0]; // plan, success, failed, edit
    const storeName = parts[1];
    const editIndex = parts[2] ? parseInt(parts[2], 10) : -1;

    const group = fields.getTextInputValue('group_count');
    const num = parseInt(fields.getTextInputValue('customer_count'), 10) || 0;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = guild.id;
    let logs = await readTennaiData(guildId, storeName, '接客ログ.json').catch(() => []) || [];
    if (!Array.isArray(logs)) logs = [];

    if (type === 'edit') {
        if (logs[editIndex]) {
            logs[editIndex].group = group;
            logs[editIndex].num = num;
            logs[editIndex].inputUser = member.displayName; // 更新者で上書き
        }
    } else {
        // 新規作成
        // type: plan -> '予定', success -> '確定', failed -> '失敗'
        const typeLabel = type === 'plan' ? '予定' : type === 'success' ? '確定' : '失敗';

        const logEntry = {
            type: typeLabel,
            group: group,
            num: num,
            enterTime: dayjs().format('HH:mm'),
            inputUser: member.displayName,
            store: storeName,
            castList: [],
            plan: '',
        };
        logs.push(logEntry);
    }

    // 保存
    await saveCustomerLog(guildId, storeName, logs);

    // パネル更新
    // 出退勤データを取得
    const today = dayjs().format('YYYY-MM-DD');
    const dailySyut = await getDailySyuttaikin(guildId, storeName, today);
    const attendanceCast = dailySyut.cast || [];

    const config = await readHikkakeConfig(guildId);
    const storePanelConfig = config.panels || {};

    try {
        await updateStorePanel(interaction.client, storeName, attendanceCast, logs, storePanelConfig);
    } catch (err) {
        console.error('パネル更新エラー:', err);
    }

    const actionMsg = type === 'edit' ? '修正' : type === 'plan' ? '予定' : type === 'success' ? '確定' : '失敗';
    await interaction.editReply({ content: `✅ ${actionMsg}情報を登録しました。` });
}

module.exports = {
    handleHikkakeReport,
    handleHikkakeReportModal,
    handleHikkakeEditSelect
};
