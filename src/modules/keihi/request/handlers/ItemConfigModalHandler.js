// @ts-check
/**
 * src/modules/keihi/request/handlers/ItemConfigModalHandler.js
 * 「経費項目登録」ボタン -> モーダル表示
 */

const BaseInteractionHandler = require('../../../../structures/BaseInteractionHandler');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { buildItemConfigModalId } = require('../ids');

class ItemConfigModalHandler extends BaseInteractionHandler {
    /**
     * モーダルを表示するため、自動 defer を無効化する
     */
    shouldAutoDefer() {
        return false;
    }

    /**
     * @param {import('discord.js').ButtonInteraction} interaction
     * @param {string} storeKey
     */
    async handle(interaction, storeKey) {
        // 現在の項目をメッセージから簡易取得（高速化のため）
        const currentItemsText = this._tryGetCurrentItemsText(interaction);

        const modal = new ModalBuilder()
            .setCustomId(buildItemConfigModalId(storeKey))
            .setTitle('経費項目登録');

        const input = new TextInputBuilder()
            .setCustomId('items')
            .setLabel('経費項目（改行で複数登録）')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('例）交通費\n消耗品\n外注費');

        if (currentItemsText) {
            input.setValue(currentItemsText);
        }

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await interaction.showModal(modal);
    }

    _tryGetCurrentItemsText(interaction) {
        try {
            const embed = interaction.message?.embeds?.[0];
            const field = embed?.fields?.find(f => f.name.includes('経費項目'));
            if (!field || field.value.includes('未設定')) return '';

            return field.value.split('\n').map(l => l.replace(/^・/, '').trim()).filter(Boolean).join('\n');
        } catch { return ''; }
    }
}

module.exports = new ItemConfigModalHandler();
