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
const { handleInteractionError } = require('../../../utils/errorHandlers');
const validator = require('../../../utils/validator');
const dayjs = require('dayjs');

async function handleHikkakeReport(interaction) {
    try {
        const { customId } = interaction;
        let storeName = null;
        let action = null;

        // ID形式: hikkake_report_{action}:{storeName}
        if (customId.includes(':')) {
            const parts = customId.split(':');
            action = parts[0].replace('hikkake_report_', '');
            storeName = parts[1];
        } else {
            // フォールバック
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
    } catch (error) {
        await handleInteractionError(interaction, error);
    }
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

async function handleHikkakeEditSelect(interaction) {
    try {
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

        modal.addComponents(
            new ActionRowBuilder().addComponents(groupInput),
            new ActionRowBuilder().addComponents(numInput)
        );

        await interaction.showModal(modal);
    } catch (error) {
        await handleInteractionError(interaction, error);
    }
}

async function handleHikkakeReportModal(interaction) {
    try {
        const { customId, fields, guild, member } = interaction;
        if (!customId.startsWith('hikkake_report_modal_')) return;

        const body = customId.replace('hikkake_report_modal_', '');
        const parts = body.split(':');
        const type = parts[0]; // plan, success, failed, edit
        const storeName = parts[1];
        const editIndex = parts[2] ? parseInt(parts[2], 10) : -1;

        const groupStr = fields.getTextInputValue('group_count');
        const numStr = fields.getTextInputValue('customer_count');

        // Validator
        if (!validator.isNumber(numStr)) {
            return interaction.reply({ content: '❌ 人数は半角数字で入力してください。', flags: MessageFlags.Ephemeral });
        }
        // Group can be string? Original was getTextInputValue. Usually it's number but let's assume loose check or keep it string if '組' needed?
        // Original code used `logs[editIndex].group = group (string)` but `logs.push({ group: group (string) })`.
        // So keeping as string is fine, or check if user meant number. The prompt implies "isNumber" check for validation.
        // I will check group as number too if it looks like one, but text input naturally is string. 
        // I'll stick to 'customer_count' validation strictly as requested in example.

        const group = groupStr;
        const num = parseInt(numStr, 10);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildId = guild.id;
        let logs = await readTennaiData(guildId, storeName, '接客ログ.json').catch(() => []) || [];
        if (!Array.isArray(logs)) logs = logs ? [logs] : []; // Safety

        if (type === 'edit') {
            if (logs[editIndex]) {
                logs[editIndex].group = group;
                logs[editIndex].num = num;
                logs[editIndex].inputUser = member.displayName;
            }
        } else {
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

        await saveCustomerLog(guildId, storeName, logs);

        // パネル更新
        const today = dayjs().format('YYYY-MM-DD');
        const dailySyut = await getDailySyuttaikin(guildId, storeName, today);
        const attendanceCast = dailySyut.cast || [];

        const config = await readHikkakeConfig(guildId);
        const storePanelConfig = config.panels || {};

        await updateStorePanel(interaction.client, storeName, attendanceCast, logs, storePanelConfig);

        const actionMsg = type === 'edit' ? '修正' : type === 'plan' ? '予定' : type === 'success' ? '確定' : '失敗';
        await interaction.editReply({ content: `✅ ${actionMsg}情報を登録しました。` });

    } catch (err) {
        await handleInteractionError(interaction, err);
    }
}

module.exports = {
    handleHikkakeReport,
    handleHikkakeReportModal,
    handleHikkakeEditSelect
};
