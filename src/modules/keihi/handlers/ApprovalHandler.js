/**
 * src/modules/keihi/handlers/ApprovalHandler.js
 * 経費承認ハンドラ (Platinum Refactoring)
 * 
 * 旧: request/action_approve.js (373行)
 * 新: Service/Repository を使用した軽量実装
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const service = require('../KeihiService');
const repo = require('../KeihiRepository');
const logger = require('../../../utils/logger');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { sendAdminLog } = require('../../../utils/config/configLogger');
const { generateKeihiCsvFiles } = require('../../../utils/keihi/keihiCsvGenerator');
const { getEmbedFieldValue, stripTilde, parseKeihiLogIdFromFooter, parseAdminLogIdFromKeihiLogContent } = require('../request/statusHelpers');
const { buildStatusButtons } = require('../request/statusHelpers');
const { resolveStoreName } = require('../setting/storeNameResolver');

const COLORS = {
    GREEN: 0x57f287,
};

/**
 * 承認ボタン押下ハンドラ
 */
async function handleApprove(interaction) {
    try {
        const { guild, member, customId } = interaction;
        if (!guild) return;

        // customId: keihi_request_approve::storeId::threadId::messageId
        const parts = customId.split('::');
        const [, storeId, threadId, messageId] = parts;

        if (!storeId || !threadId || !messageId) {
            await interaction.reply({
                content: 'ボタンIDの形式が不正です。',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 1. メッセージ取得
        const thread = await guild.channels.fetch(threadId).catch(() => null);
        if (!thread || !thread.isThread()) {
            await interaction.editReply({ content: '対象のスレッドが見つかりませんでした。' });
            return;
        }

        const threadMessage = await thread.messages.fetch(messageId).catch(() => null);
        if (!threadMessage) {
            await interaction.editReply({ content: '対象のメッセージが見つかりませんでした。' });
            return;
        }

        const baseEmbed = threadMessage.embeds?.[0];
        if (!baseEmbed) {
            await interaction.editReply({ content: '対象の経費申請メッセージが見つかりませんでした。' });
            return;
        }

        // 2. 権限チェック (Service)
        const keihiConfig = await loadKeihiConfig(guild.id);
        const requesterId = getEmbedFieldValue(baseEmbed, '入力者')?.match(/<@!?(\d+)>/)?.[1] || null;

        const permCheck = service.checkPermission('approve', member, requesterId, keihiConfig);
        if (!permCheck.ok) {
            await interaction.editReply({ content: permCheck.message });
            return;
        }

        // 3. ステータスチェック
        const status = getEmbedFieldValue(baseEmbed, 'ステータス');
        if (status?.includes('承認済み')) {
            await interaction.editReply({ content: 'この申請は既に承認済みです。' });
            return;
        }
        if (status?.includes('削除済み')) {
            await interaction.editReply({ content: 'この申請は削除済みのため承認できません。' });
            return;
        }

        // 4. データ更新 (Repository + Service)
        const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付'));
        const storeRoleConfig = await service.loadStoreRoleConfig(guild.id);
        const storeName = resolveStoreName(storeRoleConfig, storeId);

        const dailyData = await repo.getDailyData(guild.id, storeName, dateStr);
        if (!dailyData || !Array.isArray(dailyData.requests)) {
            await interaction.editReply({ content: 'データの取得に失敗しました。' });
            return;
        }

        const updateResult = service.updateRecordStatus(
            dailyData.requests,
            threadMessage.id,
            'APPROVED',
            { approver: member }
        );

        if (!updateResult) {
            await interaction.editReply({ content: 'レコードが見つかりませんでした。' });
            return;
        }

        const { prevStatus, amount } = updateResult;

        // 合計再計算
        service.recalculateTotal(dailyData, 'daily');
        dailyData.lastUpdated = new Date().toISOString();
        await repo.saveDailyData(guild.id, storeName, dateStr, dailyData);

        // 月次・年次の更新（承認済みでなければ加算）
        if (prevStatus !== 'APPROVED' && amount > 0) {
            const [yyyy, mm] = dateStr.split('-');
            const monthKey = `${yyyy}-${mm}`;

            const monthlyData = await repo.getMonthlyData(guild.id, storeName, monthKey);
            monthlyData.byDay = monthlyData.byDay || {};
            monthlyData.byDay[dateStr] = (Number(monthlyData.byDay[dateStr]) || 0) + amount;
            service.recalculateTotal(monthlyData, 'monthly');
            monthlyData.lastUpdated = dailyData.lastUpdated;
            await repo.saveMonthlyData(guild.id, storeName, monthKey, monthlyData);

            const yearlyData = await repo.getYearlyData(guild.id, storeName, yyyy);
            yearlyData.byMonth = yearlyData.byMonth || {};
            yearlyData.byMonth[monthKey] = (Number(yearlyData.byMonth[monthKey]) || 0) + amount;
            service.recalculateTotal(yearlyData, 'yearly');
            yearlyData.lastUpdated = dailyData.lastUpdated;
            await repo.saveYearlyData(guild.id, storeName, yyyy, yearlyData);
        }

        // 5. UI更新
        const now = new Date();
        const tsUnix = Math.floor(now.getTime() / 1000);
        const approvedAtText = `<t:${tsUnix}:f>`;
        const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

        const newEmbed = buildApprovedEmbed(baseEmbed, member, approvedAtText, keihiLogId);
        const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'APPROVED');
        await threadMessage.edit({ embeds: [newEmbed], components: [newButtonsRow] });

        // 6. CSV再生成
        await generateKeihiCsvFiles(guild, storeName, dailyData, null, null).catch(() => { });

        await interaction.editReply({ content: '経費申請を承認しました。' });
    } catch (err) {
        logger.error('[Keihi/ApprovalHandler] Unexpected error', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '承認処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => { });
        } else {
            await interaction.editReply({ content: '承認処理中にエラーが発生しました。' }).catch(() => { });
        }
    }
}

function buildApprovedEmbed(baseEmbed, approver, approvedAtText, logId) {
    return new EmbedBuilder()
        .setTitle('✅ 経費申請　承認しました')
        .setColor(COLORS.GREEN)
        .addFields(
            { name: 'ステータス', value: '✅ 承認済み', inline: true },
            { name: '日付', value: stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '未入力', inline: true },
            { name: '部署', value: stripTilde(getEmbedFieldValue(baseEmbed, '部署')) || '未入力', inline: true },
            { name: '経費項目', value: stripTilde(getEmbedFieldValue(baseEmbed, '経費項目')) || '未入力', inline: true },
            { name: '金額', value: stripTilde(getEmbedFieldValue(baseEmbed, '金額')) || '未入力', inline: true },
            { name: '備考', value: stripTilde(getEmbedFieldValue(baseEmbed, '備考')) || '未入力', inline: true },
            { name: '入力者', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力者')) || '未入力', inline: true },
            { name: '入力時間', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力時間')) || '未入力', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '承認者', value: `${approver}`, inline: true },
            { name: '承認時間', value: approvedAtText, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `LogID: ${logId || '-'}` });
}

module.exports = { handleApprove };
