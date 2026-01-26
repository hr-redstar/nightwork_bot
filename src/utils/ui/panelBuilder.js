/**
 * src/utils/ui/PanelBuilder.js
 * パネル（Embed + Components）を構築するための Fluent API / Utility Class
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');

class PanelBuilder {
    constructor() {
        this.embed = new EmbedBuilder().setTimestamp();
        this.rows = [];
    }

    // --- Embed 設定 ---
    setTitle(title) {
        this.embed.setTitle(title);
        return this;
    }

    setDescription(description) {
        this.embed.setDescription(description);
        return this;
    }

    setColor(color) {
        this.embed.setColor(color);
        return this;
    }

    addFields(fields) {
        if (fields && fields.length > 0) {
            this.embed.addFields(fields);
        }
        return this;
    }

    setFooter(text, iconURL) {
        this.embed.setFooter({ text, iconURL });
        return this;
    }

    setAuthor(name, iconURL, url) {
        this.embed.setAuthor({ name, iconURL, url });
        return this;
    }

    // --- Component 設定 ---

    /**
     * ボタンの行を追加
     * @param {Array<{label: string, customId: string, style?: ButtonStyle, emoji?: string, url?: string, disabled?: boolean}>} buttons 
     */
    addButtons(buttons) {
        const row = new ActionRowBuilder();
        const components = buttons.map(btn => {
            const builder = new ButtonBuilder()
                .setLabel(btn.label)
                .setStyle(btn.style || ButtonStyle.Primary)
                .setDisabled(!!btn.disabled);

            if (btn.emoji) builder.setEmoji(btn.emoji);

            if (btn.style === ButtonStyle.Link && btn.url) {
                builder.setURL(btn.url);
            } else {
                builder.setCustomId(btn.customId);
            }
            return builder;
        });

        row.addComponents(components);
        this.rows.push(row);
        return this;
    }

    /**
     * セレクトメニューを追加
     * @param {object} options
     * @param {string} options.customId
     * @param {Array<{label: string, value: string, description?: string, default?: boolean, emoji?: string}>} options.options
     * @param {string} [options.placeholder]
     * @param {number} [options.minValues]
     * @param {number} [options.maxValues]
     * @param {boolean} [options.disabled]
     */
    addSelectMenu({ customId, options, placeholder, minValues, maxValues, disabled }) {
        const row = new ActionRowBuilder();
        const select = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder || '選択してください')
            .addOptions(options.map(opt => ({
                label: opt.label,
                value: opt.value,
                description: opt.description,
                default: opt.default,
                emoji: opt.emoji
            })))
            .setDisabled(!!disabled);

        if (minValues !== undefined) select.setMinValues(minValues);
        if (maxValues !== undefined) select.setMaxValues(maxValues);

        row.addComponents(select);
        this.rows.push(row);
        return this;
    }

    /**
     * ペイロードを生成 (reply / send / edit 用)
     */
    toJSON() {
        return {
            embeds: [this.embed],
            components: this.rows
        };
    }

    // --- Static Utility ---

    /**
     * オブジェクト定義からパネルを生成
     * @param {object} def
     * @param {string} def.title
     * @param {string} [def.description]
     * @param {number|string} [def.color]
     * @param {Array} [def.fields]
     * @param {Array} [def.components] - Raw ActionRows or structured Button/Select defs (Simplification mainly for Embed)
     */
    static build(def) {
        const builder = new PanelBuilder()
            .setTitle(def.title)
            .setColor(def.color);

        if (def.description) builder.setDescription(def.description);
        if (def.fields) builder.addFields(def.fields);

        // componentsは複雑なので、基本はビルダーメソッドを使うことを推奨するか、
        // ここで再帰的にパースするか。
        // 一旦、Builderインスタンスを返してチェーンさせる形にする
        return builder;
    }
}

/**
 * 簡易ヘルパー (panelImplementation.js との互換性などを考慮)
 * @param {object} options
 */
function buildPanel(options) {
    const builder = PanelBuilder.build(options);

    // buttons プロパティがあれば追加 (簡易フォーマット: 行分割などは自動ではないが、配列の配列なら対応可能)
    if (options.buttons) {
        // もし2次元配列なら複数行、1次元なら1行とみなす
        if (Array.isArray(options.buttons[0])) {
            options.buttons.forEach(row => builder.addButtons(row));
        } else {
            builder.addButtons(options.buttons);
        }
    }

    return builder.toJSON();
}

module.exports = {
    PanelBuilder,
    buildPanel
};
