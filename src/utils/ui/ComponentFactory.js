/**
 * src/utils/ui/ComponentFactory.js
 * Discord コンポーネント生成の共通ファクトリ
 * -----------------------------------------
 * - Button, SelectMenu, Modal の生成をラップ
 * - 一貫したスタイルの適用
 * - ボイラープレートの削減
 */

const {
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const ComponentFactory = {
    /**
     * ボタンを作成
     * @param {Object} options
     * @param {string} options.id - CustomID
     * @param {string} options.label - ラベル
     * @param {number} [options.style=ButtonStyle.Secondary] - スタイル
     * @param {string} [options.emoji] - 絵文字
     * @param {boolean} [options.disabled=false] - 無効化
     */
    createButton({ id, label, style = ButtonStyle.Secondary, emoji, disabled = false }) {
        const btn = new ButtonBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(disabled);

        if (emoji) btn.setEmoji(emoji);
        return btn;
    },

    /**
     * 文字列セレクトメニューを作成
     * @param {Object} options
     * @param {string} options.id - CustomID
     * @param {string} [options.placeholder] - プレースホルダー
     * @param {Array<{label: string, value: string, description?: string, emoji?: string, default?: boolean}>} options.options - 選択肢
     * @param {number} [options.minValues=1]
     * @param {number} [options.maxValues=1]
     * @param {boolean} [options.disabled=false]
     */
    createSelect({ id, placeholder, options, minValues = 1, maxValues = 1, disabled = false }) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(id)
            .setPlaceholder(placeholder || '選択してください')
            .setMinValues(minValues)
            .setMaxValues(maxValues)
            .setDisabled(disabled);

        if (options && options.length > 0) {
            select.addOptions(options.slice(0, 25));
        }

        return select;
    },

    /**
     * モーダルを作成
     * @param {Object} options
     * @param {string} options.id - CustomID
     * @param {string} options.title - タイトル
     * @param {Array<TextInputBuilder|Object>} options.inputs - 入力項目
     */
    createModal({ id, title, inputs }) {
        const modal = new ModalBuilder()
            .setCustomId(id)
            .setTitle(title);

        if (inputs && inputs.length > 0) {
            modal.addComponents(
                inputs.map(input => {
                    const builder = input instanceof TextInputBuilder
                        ? input
                        : this.createTextInput(input);
                    return new ActionRowBuilder().addComponents(builder);
                })
            );
        }

        return modal;
    },

    /**
     * テキスト入力を生成 (モーダル用)
     */
    createTextInput({ id, label, style = TextInputStyle.Short, placeholder, value, required = true, minLength, maxLength }) {
        const input = new TextInputBuilder()
            .setCustomId(id)
            .setLabel(label)
            .setStyle(style)
            .setRequired(required);

        if (placeholder) input.setPlaceholder(placeholder);
        if (value) input.setValue(String(value));
        if (minLength !== undefined) input.setMinLength(minLength);
        if (maxLength !== undefined) input.setMaxLength(maxLength);

        return input;
    },

    /**
     * コンポーネントを ActionRow に配置
     * @param {Array<any>} components
     */
    createActionRow(components) {
        return new ActionRowBuilder().addComponents(components);
    },

    /**
     * 大量のボタンを適切に ActionRow (最大5つずつ) に分割する
     * @param {Array<ButtonBuilder>} buttons
     */
    splitButtonsToRows(buttons) {
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }
        return rows;
    }
};

module.exports = ComponentFactory;
