// @ts-check
/**
 * src/modules/tennai_hikkake/handlers/ExecuteHandler.js
 * 店内状況・報告実行ハンドラー (Platinum Standard)
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const service = require('../HikkakeService');
const repo = require('../HikkakeRepository');
const { createDynamicTennaiPanel } = require('../ui/tennaiPanel');
const { getDailySyuttaikin } = require('../../../utils/syut/syutConfigManager');
const validator = require('../../../utils/validator');
const dayjs = require('dayjs');
const logger = require('../../../utils/logger');

class ExecuteHandler extends BaseInteractionHandler {
    /**
     * @param {import('discord.js').Interaction} interaction 
     */
    async handle(interaction) {
        const { customId } = interaction;
        const [, , action, storeName] = customId.split(':');

        if (action === 'plan') return this.showModal(interaction, storeName, 'plan', '🐟 ひっかけ予定入力');
        if (action === 'success') return this.showModal(interaction, storeName, 'success', '🎣 ひっかけ確定入力');
        if (action === 'failed') return this.showModal(interaction, storeName, 'failed', '💨 ひっかけ失敗入力');
        if (action === 'edit_menu') return this.showEditSelect(interaction, storeName);

        throw new Error(`[Hikkake] Unknown action: ${action}`);
    }

    /**
     * 報告用モーダルを表示
     */
    async showModal(interaction, storeName, type, title) {
        const modal = new ModalBuilder()
            .setCustomId(`tennai_hikkake:execute:modal_submit:${type}:${storeName}`)
            .setTitle(title);

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('group_count').setLabel('組数').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('1')),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('customer_count').setLabel('人数').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('2'))
        );

        await interaction.showModal(modal);
    }

    /**
     * 履歴編集メニューを表示
     */
    async showEditSelect(interaction, storeName) {
        const guildId = interaction.guildId;
        const logs = await repo.getDailyLogs(guildId);
        const storeLogs = logs.filter(l => l.store === storeName).reverse().slice(0, 10);

        if (storeLogs.length === 0) {
            return interaction.reply({ content: '⚠️ 編集可能な履歴がありません。', flags: MessageFlags.Ephemeral });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId(`tennai_hikkake:execute:edit_select:${storeName}`)
            .setPlaceholder('編集する項目を選択してください')
            .addOptions(storeLogs.map((l, i) => ({
                label: `${l.enterTime || '不明'} ${l.type} ${l.num}名 (入力:${l.inputUser})`,
                description: `組:${l.group} 担当:${(l.castList || []).join(',')}`,
                value: `idx:${logs.indexOf(l)}`,
                emoji: l.type === '予定' ? '🐟' : l.type === '確定' ? '🎣' : '💨'
            })));

        await interaction.reply({
            content: '✏️ **修正したい履歴**を選択してください（直近10件）',
            components: [new ActionRowBuilder().addComponents(select)],
            flags: MessageFlags.Ephemeral
        });
    }

    /**
     * 履歴選択後の編集モーダル
     */
    async handleEditSelect(interaction) {
        const storeName = interaction.customId.split(':')[3];
        const logIdx = parseInt(interaction.values[0].split(':')[1], 10);
        const logs = await repo.getDailyLogs(interaction.guildId);
        const target = logs[logIdx];

        if (!target) return interaction.update({ content: '❌ ログが見つかりませんでした。', components: [] });

        const modal = new ModalBuilder()
            .setCustomId(`tennai_hikkake:execute:modal_submit:edit:${storeName}:${logIdx}`)
            .setTitle('✏️ 履歴修正');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('group_count').setLabel('組数').setStyle(TextInputStyle.Short).setValue(String(target.group))),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('customer_count').setLabel('人数').setStyle(TextInputStyle.Short).setValue(String(target.num)))
        );

        await interaction.showModal(modal);
    }

    /**
     * モーダル送信時
     */
    async handleModalSubmit(interaction) {
        const [, , , type, storeName, editIdxStr] = interaction.customId.split(':');
        const guildId = interaction.guildId;
        const groupStr = interaction.fields.getTextInputValue('group_count');
        const numStr = interaction.fields.getTextInputValue('customer_count');

        if (!validator.isNumber(numStr)) {
            return interaction.reply({ content: '❌ 人数は数字で入力してください。', flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const logs = await repo.getDailyLogs(guildId);
        if (type === 'edit') {
            const idx = parseInt(editIdxStr, 10);
            if (logs[idx]) {
                logs[idx].group = groupStr;
                logs[idx].num = parseInt(numStr, 10);
                logs[idx].inputUser = interaction.member.displayName;
            }
        } else {
            const typeLabel = type === 'plan' ? '予定' : type === 'success' ? '確定' : '失敗';
            logs.push({
                type: typeLabel, store: storeName, group: groupStr, num: parseInt(numStr, 10),
                enterTime: dayjs().format('HH:mm'), inputUser: interaction.member.displayName,
                castList: [], plan: ''
            });
        }

        await repo.saveDailyLogs(guildId, logs);
        await this.syncPanel(interaction, storeName, logs);

        await interaction.editReply({ content: '✅ 店内状況を更新しました。' });
    }

    /**
     * 全パネル更新同期
     */
    async syncPanel(interaction, storeName, logs) {
        const guildId = interaction.guildId;
        const config = await repo.getGlobalConfig(guildId);
        const panelInfo = config.panels?.[storeName];
        if (!panelInfo?.channelId || !panelInfo?.messageId) return;

        const dailySyut = await getDailySyuttaikin(guildId, storeName, dayjs().format('YYYY-MM-DD'));
        const payload = createDynamicTennaiPanel(storeName, dailySyut.cast || [], logs);

        try {
            const channel = await interaction.guild.channels.fetch(panelInfo.channelId);
            if (channel?.isTextBased()) {
                const message = await channel.messages.fetch(panelInfo.messageId);
                if (message) await message.edit(payload);
            }
        } catch (err) {
            logger.warn(`[Hikkake] Panel sync failed for ${storeName}`, err);
        }
    }
}

module.exports = new ExecuteHandler();
