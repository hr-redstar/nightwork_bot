// @ts-check
/**
 * src/modules/keihi/request/handlers/RequestItemSelectHandler.js
 * 経費項目選択 (Select Menu) -> 申請モーダル表示
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { loadStoreRoleConfig } = require('../../../../utils/config/storeRoleConfigManager');
const { resolveStoreName } = require('../../setting/storeNameResolver');
const { IDS: REQ_IDS } = require('../requestIds');

class RequestItemSelectHandler extends BaseInteractionHandler {
    /**
     * モーダルを表示するため、自動 defer を無効化する
     */
    shouldAutoDefer() {
        return false;
    }

    /**
     * @param {import('discord.js').StringSelectMenuInteraction} interaction
     * @param {string} storeKey
     */
    async handle(interaction, storeKey) {
        if (!storeKey) return;
        const guildId = interaction.guild?.id;
        if (!guildId) return;

        const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
        const itemLabel = interaction.values[0];
        const storeName = resolveStoreName(storeRoleConfig, storeKey);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const modal = new ModalBuilder()
            .setCustomId(`${REQ_IDS.REQUEST_MODAL}::${storeKey}`)
            .setTitle(`経費申請：${storeName}`);

        const dateInput = new TextInputBuilder()
            .setCustomId('date')
            .setLabel('日付（YYYY-MM-DD）')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(todayStr);

        const deptInput = new TextInputBuilder()
            .setCustomId('department')
            .setLabel('部署')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const itemInput = new TextInputBuilder()
            .setCustomId('item')
            .setLabel('経費項目')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(itemLabel.slice(0, 100));

        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('金額（半角数字）')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const noteInput = new TextInputBuilder()
            .setCustomId('note')
            .setLabel('備考')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(deptInput),
            new ActionRowBuilder().addComponents(itemInput),
            new ActionRowBuilder().addComponents(amountInput),
            new ActionRowBuilder().addComponents(noteInput),
        );

        await interaction.showModal(modal);
    }
}

module.exports = new RequestItemSelectHandler();
