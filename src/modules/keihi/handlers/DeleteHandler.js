/**
 * src/modules/keihi/handlers/DeleteHandler.js
 * 経費削除ハンドラ (Platinum Refactoring)
 * 
 * 旧: request/action_delete.js (414行)
 * 新: Service/Repository を使用した軽量実装
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const service = require('../KeihiService');
const repo = require('../KeihiRepository');
const logger = require('../../../utils/logger');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { getEmbedFieldValue, stripTilde, parseKeihiLogIdFromFooter, buildStatusButtons } = require('../request/statusHelpers');
const { resolveStoreName } = require('../setting/storeNameResolver');
const { sendAdminLog } = require('../../../utils/config/configLogger');

const COLORS = {
    RED: 0xed4245,
};

/**
 * 削除ボタン押下ハンドラ
 */
async function handleDelete(interaction) {
    try {
        const { guild, member, customId } = interaction;
        if (!guild) return;

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

        // メッセージ取得
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

        // 権限チェック
        const keihiConfig = await loadKeihiConfig(guild.id);
        const requesterId = getEmbedFieldValue(baseEmbed, '入力者')?.match(/<@!?(\d+)>/)?.[1] || null;

        const permCheck = service.checkPermission('delete', member, requesterId, keihiConfig);
        if (!permCheck.ok) {
            await interaction.editReply({ content: permCheck.message });
            return;
        }

        // ステータスチェック
        const status = getEmbedFieldValue(baseEmbed, 'ステータス');
        if (status?.includes('削除済み')) {
            await interaction.editReply({ content: 'この申請は既に削除済みです。' });
            return;
        }

        // データ更新
        const dateStr = stripTilde(getEmbedFieldValue(baseEmbed, '日付'));
        const storeRoleConfig = await service.loadStoreRoleConfig(guild.id);
        const storeName = resolveStoreName(storeRoleConfig, storeId);

        const dailyData = await repo.getDailyData(guild.id, storeName, dateStr);
        if (dailyData && Array.isArray(dailyData.requests)) {
            const record = dailyData.requests.find(r => String(r.id) === String(threadMessage.id));
            if (record) {
                const prevStatus = record.status;
                const amount = Number(record.amount || 0);

                // ステータスを削除済みに変更
                record.status = 'DELETED';
                record.statusJa = '削除';
                record.deletedBy = member.displayName || member.user?.username;
                record.deletedAt = new Date().toISOString();
                record.lastUpdated = record.deletedAt;

                // 承認済みだった場合、合計から減算
                if (prevStatus === 'APPROVED' && amount > 0) {
                    service.recalculateTotal(dailyData, 'daily');

                    // 月次・年次からも減算
                    const [yyyy, mm] = dateStr.split('-');
                    const monthKey = `${yyyy}-${mm}`;

                    const monthlyData = await repo.getMonthlyData(guild.id, storeName, monthKey);
                    if (monthlyData.byDay) {
                        monthlyData.byDay[dateStr] = Math.max(0, (Number(monthlyData.byDay[dateStr]) || 0) - amount);
                        service.recalculateTotal(monthlyData, 'monthly');
                        monthlyData.lastUpdated = record.deletedAt;
                        await repo.saveMonthlyData(guild.id, storeName, monthKey, monthlyData);
                    }

                    const yearlyData = await repo.getYearlyData(guild.id, storeName, yyyy);
                    if (yearlyData.byMonth) {
                        yearlyData.byMonth[monthKey] = Math.max(0, (Number(yearlyData.byMonth[monthKey]) || 0) - amount);
                        service.recalculateTotal(yearlyData, 'yearly');
                        yearlyData.lastUpdated = record.deletedAt;
                        await repo.saveYearlyData(guild.id, storeName, yyyy, yearlyData);
                    }
                }

                dailyData.lastUpdated = record.deletedAt;
                await repo.saveDailyData(guild.id, storeName, dateStr, dailyData);
            }
        }

        // UI更新
        const now = new Date();
        const tsUnix = Math.floor(now.getTime() / 1000);
        const deletedAtText = `<t:${tsUnix}:f>`;
        const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

        const newEmbed = buildDeletedEmbed(baseEmbed, member, deletedAtText, keihiLogId);
        const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'DELETED');
        await threadMessage.edit({ embeds: [newEmbed], components: [newButtonsRow] });

        // 管理者ログ
        try {
            const adminEmbed = new EmbedBuilder()
                .setTitle(`日付：${dateStr}`)
                .setColor(COLORS.RED)
                .addFields(
                    { name: '削除者', value: `${member}`, inline: true },
                    { name: '削除時間', value: deletedAtText, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: 'スレッドメッセージリンク', value: threadMessage.url, inline: false },
                )
                .setTimestamp(now);

            await sendAdminLog(interaction, {
                action: 'DELETE',
                content: `経費　🗑️削除\n店舗「${storeName}」\n${dateStr} の申請が削除されました。`,
                embeds: [adminEmbed],
            });
        } catch (e) {
            logger.warn('[Keihi/DeleteHandler] sendAdminLog failed', e);
        }

        await interaction.editReply({ content: '経費申請を削除しました。' });
    } catch (err) {
        logger.error('[Keihi/DeleteHandler] Unexpected error', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '削除処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => { });
        } else {
            await interaction.editReply({ content: '削除処理中にエラーが発生しました。' }).catch(() => { });
        }
    }
}

function buildDeletedEmbed(baseEmbed, deleter, deletedAtText, logId) {
    return new EmbedBuilder()
        .setTitle('🗑️ 経費申請　削除しました')
        .setColor(COLORS.RED)
        .addFields(
            { name: 'ステータス', value: '🗑️ 削除済み', inline: true },
            { name: '日付', value: stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '未入力', inline: true },
            { name: '部署', value: stripTilde(getEmbedFieldValue(baseEmbed, '部署')) || '未入力', inline: true },
            { name: '経費項目', value: stripTilde(getEmbedFieldValue(baseEmbed, '経費項目')) || '未入力', inline: true },
            { name: '金額', value: stripTilde(getEmbedFieldValue(baseEmbed, '金額')) || '未入力', inline: true },
            { name: '備考', value: stripTilde(getEmbedFieldValue(baseEmbed, '備考')) || '未入力', inline: true },
            { name: '入力者', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力者')) || '未入力', inline: true },
            { name: '入力時間', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力時間')) || '未入力', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '削除者', value: `${deleter}`, inline: true },
            { name: '削除時間', value: deletedAtText, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `LogID: ${logId || '-'}` });
}

module.exports = { handleDelete };
