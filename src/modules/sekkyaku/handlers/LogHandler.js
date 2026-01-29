// @ts-check
/**
 * src/modules/sekkyaku/handlers/LogHandler.js
 * 接客ログ報告ハンドラー (Platinum Standard)
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const service = require('../SekkyakuService');
const repo = require('../SekkyakuRepository');
const hikkakeHandler = require('../../tennai_hikkake/handlers/ExecuteHandler');
const validator = require('../../../utils/validator');
const logger = require('../../../utils/logger');

class LogHandler extends BaseInteractionHandler {
    /**
     * 接客開始モーダルを表示
     */
    async showStartModal(interaction, storeName) {
        const modal = new ModalBuilder()
            .setCustomId(`sekkyaku:execute:modal_submit:start:${storeName}`)
            .setTitle(`⛳ 接客開始報告 - ${storeName}`);

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('table_no').setLabel('卓番/場所').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('1番卓')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('group_count').setLabel('組数').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('1')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('customer_count').setLabel('人数').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('2')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cast_names').setLabel('担当キャスト (名前をカンマ区切りで入力)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Aちゃん, Bちゃん'))
        );

        await interaction.showModal(modal);
    }

    /**
     * 接客終了メニュー（動いている接客の一覧）を表示
     */
    async showEndMenu(interaction, storeName) {
        const guildId = interaction.guildId;
        const index = await repo.getDailyLogs(guildId, require('dayjs')().format('YYYY-MM-DD'));
        const activeLogs = index.filter(l => l.store === storeName && l.status === 'active');

        if (activeLogs.length === 0) {
            return interaction.reply({ content: '⚠️ 現在進行中の接客はありません。', flags: MessageFlags.Ephemeral });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`sekkyaku:execute:end_select:${storeName}`)
            .setPlaceholder('終了する接客を選択してください')
            .addOptions(activeLogs.map(l => ({
                label: `卓:${l.group} [${l.enterTime}] ${l.num}名 (担当:${l.castList.join(',')})`,
                value: l.id,
                emoji: '🏁'
            })));

        await interaction.reply({
            content: '🏁 **終了する接客**を選択してください。',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * 接客開始（モーダル送信）の処理
     */
    async handleStartSubmit(interaction) {
        const [, , , , storeName] = interaction.customId.split(':');
        const fields = interaction.fields;

        const tableNo = fields.getTextInputValue('table_no');
        const groupCount = fields.getTextInputValue('group_count');
        const customerCount = fields.getTextInputValue('customer_count');
        const castNames = fields.getTextInputValue('cast_names').split(/[,,、\s]+/).filter(Boolean);

        if (!validator.isNumber(customerCount)) {
            return interaction.reply({ content: '❌ 人数は数字で入力してください。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // 接客開始処理 (同期処理含む)
            await service.startSekkyaku(interaction.guildId, {
                storeName,
                groupCount: tableNo, // 現場では卓番＝グループ（組）として扱うことが多い
                customerCount,
                castNames,
                inputUser: interaction.member.displayName
            });

            // 店内状況パネルの同期更新 (hikkakeモジュールの機能を利用)
            const hikkakeLogs = await require('../../tennai_hikkake/HikkakeRepository').getDailyLogs(interaction.guildId);
            await hikkakeHandler.syncPanel(interaction, storeName, hikkakeLogs);

            await interaction.editReply({ content: `✅ [${storeName}] 接客開始を登録し、店内状況を更新しました。` });
        } catch (err) {
            logger.error('[Sekkyaku] Start failed:', err);
            await interaction.editReply({ content: '❌ 登録中にエラーが発生しました。' });
        }
    }

    /**
     * 接客終了処理
     */
    async handleEndSelect(interaction) {
        const storeName = interaction.customId.split(':')[3];
        const logId = interaction.values[0];
        const guildId = interaction.guildId;
        const today = require('dayjs')().format('YYYY-MM-DD');

        const logs = await repo.getDailyLogs(guildId, today);
        const logIdx = logs.findIndex(l => l.id === logId);

        if (logIdx === -1) return interaction.update({ content: '❌ 指定された接客ログが見つかりません。', components: [] });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 状態を終了に変更
        logs[logIdx].status = 'archived';
        logs[logIdx].endTime = new Date().toISOString();
        await repo.saveDailyLogs(guildId, today, logs);

        // --- 店内状況（ひっかけ）側からも削除/更新 ---
        const hikkakeRepo = require('../../tennai_hikkake/HikkakeRepository');
        let hikkakeLogs = await hikkakeRepo.getDailyLogs(guildId);
        // 同じIDまたは同じ特徴のログを「完了」したものとしてフィルタリング
        hikkakeLogs = hikkakeLogs.filter(l => l.id !== logId);
        await hikkakeRepo.saveDailyLogs(guildId, hikkakeLogs);

        // パネル同期
        await hikkakeHandler.syncPanel(interaction, storeName, hikkakeLogs);

        await interaction.editReply({ content: `✅ [${storeName}] 接客終了を記録しました。お疲れ様でした！` });
    }
}

module.exports = new LogHandler();
