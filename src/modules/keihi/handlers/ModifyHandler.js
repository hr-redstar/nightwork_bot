/**
 * src/modules/keihi/handlers/ModifyHandler.js
 * 経費修正ハンドラ (Platinum Refactoring)
 * 
 * 旧: request/action_modify.js (507行)
 * 新: Service/Repository を使用した軽量実装
 */

const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const service = require('../KeihiService');
const repo = require('../KeihiRepository');
const logger = require('../../../utils/logger');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { getEmbedFieldValue, stripTilde, parseKeihiLogIdFromFooter, buildStatusButtons } = require('../request/statusHelpers');
const { resolveStoreName } = require('../setting/storeNameResolver');
const { showModalSafe } = require('../../../utils/InteractionAckHelper');

const COLORS = {
    BLUE: 0x5865f2,
};

/**
 * 修正ボタン押下 → モーダル表示
 */
async function handleModifyButton(interaction) {
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

        // メッセージ取得
        const thread = await guild.channels.fetch(threadId).catch(() => null);
        if (!thread || !thread.isThread()) {
            await interaction.reply({ content: '対象のスレッドが見つかりませんでした。', flags: MessageFlags.Ephemeral });
            return;
        }

        const threadMessage = await thread.messages.fetch(messageId).catch(() => null);
        if (!threadMessage) {
            await interaction.reply({ content: '対象のメッセージが見つかりませんでした。', flags: MessageFlags.Ephemeral });
            return;
        }

        const baseEmbed = threadMessage.embeds?.[0];
        if (!baseEmbed) {
            await interaction.reply({ content: '対象の経費申請メッセージが見つかりませんでした。', flags: MessageFlags.Ephemeral });
            return;
        }

        // 権限チェック
        const keihiConfig = await loadKeihiConfig(guild.id);
        const requesterId = getEmbedFieldValue(baseEmbed, '入力者')?.match(/<@!?(\d+)>/)?.[1] || null;

        const permCheck = service.checkPermission('modify', member, requesterId, keihiConfig);
        if (!permCheck.ok) {
            await interaction.reply({ content: permCheck.message, flags: MessageFlags.Ephemeral });
            return;
        }

        // ステータスチェック
        const status = getEmbedFieldValue(baseEmbed, 'ステータス');
        if (status?.includes('削除済み')) {
            await interaction.reply({ content: 'この申請は削除済みのため修正できません。', flags: MessageFlags.Ephemeral });
            return;
        }

        // モーダル構築
        const modal = new ModalBuilder()
            .setCustomId(`keihi_request_modify_modal::${storeId}::${threadId}::${messageId}`)
            .setTitle('経費申請を修正');

        const dateInput = new TextInputBuilder()
            .setCustomId('date')
            .setLabel('日付 (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setValue(stripTilde(getEmbedFieldValue(baseEmbed, '日付')) || '')
            .setRequired(true);

        const departmentInput = new TextInputBuilder()
            .setCustomId('department')
            .setLabel('部署')
            .setStyle(TextInputStyle.Short)
            .setValue(stripTilde(getEmbedFieldValue(baseEmbed, '部署')) || '')
            .setRequired(false);

        const itemInput = new TextInputBuilder()
            .setCustomId('item')
            .setLabel('経費項目')
            .setStyle(TextInputStyle.Short)
            .setValue(stripTilde(getEmbedFieldValue(baseEmbed, '経費項目')) || '')
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('金額')
            .setStyle(TextInputStyle.Short)
            .setValue(stripTilde(getEmbedFieldValue(baseEmbed, '金額')) || '')
            .setRequired(true);

        const noteInput = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('備考')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(stripTilde(getEmbedFieldValue(baseEmbed, '備考')) || '')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(departmentInput),
            new ActionRowBuilder().addComponents(itemInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(noteInput)
        );

        await showModalSafe(interaction, modal);
    } catch (err) {
        logger.error('[Keihi/ModifyHandler] handleModifyButton error', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '修正モーダル表示中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => { });
        }
    }
}

/**
 * 修正モーダル送信
 */
async function handleModifyModalSubmit(interaction) {
    try {
        const { guild, member, customId, fields } = interaction;
        if (!guild) return;

        const parts = customId.split('::');
        const [, storeId, threadId, messageId] = parts;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
        const keihiLogId = parseKeihiLogIdFromFooter(baseEmbed);

        // 入力値取得
        const date = fields.getTextInputValue('date');
        const department = fields.getTextInputValue('department');
        const item = fields.getTextInputValue('item');
        const amount = fields.getTextInputValue('amount');
        const note = fields.getTextInputValue('note');

        const now = new Date();
        const tsUnix = Math.floor(now.getTime() / 1000);
        const modifiedAtText = `<t:${tsUnix}:f>`;

        // Embed更新
        const newEmbed = buildModifiedEmbed(baseEmbed, {
            date,
            department,
            item,
            amount,
            note,
            modifier: member,
            modifiedAtText,
            logId: keihiLogId
        });

        const newButtonsRow = buildStatusButtons(storeId, threadId, messageId, 'MODIFIED');
        await threadMessage.edit({ embeds: [newEmbed], components: [newButtonsRow] });

        // データ更新 (Repository)
        const storeRoleConfig = await service.loadStoreRoleConfig(guild.id);
        const storeName = resolveStoreName(storeRoleConfig, storeId);
        const dailyData = await repo.getDailyData(guild.id, storeName, date);

        if (dailyData && Array.isArray(dailyData.requests)) {
            const record = dailyData.requests.find(r => String(r.id) === String(threadMessage.id));
            if (record) {
                record.date = date;
                record.department = department;
                record.item = item;
                record.amount = amount;
                record.note = note;
                record.modifiedBy = member.displayName || member.user?.username;
                record.modifiedAt = now.toISOString();
                record.lastUpdated = now.toISOString();

                await repo.saveDailyData(guild.id, storeName, date, dailyData);
            }
        }

        await interaction.editReply({ content: '経費申請を修正しました。' });
    } catch (err) {
        logger.error('[Keihi/ModifyHandler] handleModifyModalSubmit error', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '修正処理中にエラーが発生しました。', flags: MessageFlags.Ephemeral }).catch(() => { });
        } else {
            await interaction.editReply({ content: '修正処理中にエラーが発生しました。' }).catch(() => { });
        }
    }
}

function buildModifiedEmbed(baseEmbed, data) {
    return new EmbedBuilder()
        .setTitle('📝 経費申請　修正しました')
        .setColor(COLORS.BLUE)
        .addFields(
            { name: 'ステータス', value: '📝 修正済み', inline: true },
            { name: '日付', value: data.date || '未入力', inline: true },
            { name: '部署', value: data.department || '未入力', inline: true },
            { name: '経費項目', value: data.item || '未入力', inline: true },
            { name: '金額', value: data.amount || '未入力', inline: true },
            { name: '備考', value: data.note || '未入力', inline: true },
            { name: '入力者', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力者')) || '未入力', inline: true },
            { name: '入力時間', value: stripTilde(getEmbedFieldValue(baseEmbed, '入力時間')) || '未入力', inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
            { name: '修正者', value: `${data.modifier}`, inline: true },
            { name: '修正時間', value: data.modifiedAtText, inline: true },
            { name: '\u200b', value: '\u200b', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: `LogID: ${data.logId || '-'}` });
}

module.exports = { handleModifyButton, handleModifyModalSubmit };
