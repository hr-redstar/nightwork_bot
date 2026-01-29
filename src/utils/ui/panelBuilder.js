/**
 * src/utils/ui/PanelBuilder.js
 * パネル（Embed + Components）を構築するための Fluent API / Utility Class
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');

const DEFAULT_COLOR = '#2b2d31'; // Premium Dark Theme

class PanelBuilder {
    constructor() {
        this.embed = new EmbedBuilder().setTimestamp().setColor(DEFAULT_COLOR);
        this.rows = [];
    }

    // --- Embed 設定 ---
    setTitle(title) {
        if (title) this.embed.setTitle(title.slice(0, 256));
        return this;
    }

    setDescription(description) {
        if (description) this.embed.setDescription(description.slice(0, 4096));
        return this;
    }

    setColor(color) {
        if (color) this.embed.setColor(color);
        return this;
    }

    setThumbnail(url) {
        if (url) this.embed.setThumbnail(url);
        return this;
    }

    setImage(url) {
        if (url) this.embed.setImage(url);
        return this;
    }

    addFields(fields) {
        if (Array.isArray(fields)) {
            this.embed.addFields(fields.map(f => ({
                name: String(f.name).slice(0, 256),
                value: String(f.value).slice(0, 1024),
                inline: !!f.inline
            })));
        }
        return this;
    }

    setFooter(text, iconURL) {
        if (text) this.embed.setFooter({ text: text.slice(0, 2048), iconURL });
        return this;
    }

    setAuthor(name, iconURL, url) {
        if (name) this.embed.setAuthor({ name: name.slice(0, 256), iconURL, url });
        return this;
    }

    // --- Component 設定 ---

    /**
     * ボタンを追加（自動的に5つずつ行分割される）
     * @param {Array<{label: string, customId: string, style?: ButtonStyle, emoji?: string, url?: string, disabled?: boolean}>} buttons 
     */
    addButtons(buttons) {
        if (!buttons || !buttons.length) return this;

        // 5つずつに分割して追加
        for (let i = 0; i < buttons.length; i += 5) {
            const chunk = buttons.slice(i, i + 5);
            const row = new ActionRowBuilder();

            const components = chunk.map(btn => {
                const builder = new ButtonBuilder()
                    .setLabel(btn.label?.slice(0, 80))
                    .setStyle(btn.style || ButtonStyle.Primary)
                    .setDisabled(!!btn.disabled);

                if (btn.emoji) builder.setEmoji(btn.emoji);

                if (btn.style === ButtonStyle.Link && btn.url) {
                    builder.setURL(btn.url);
                } else {
                    const finalId = btn.customId || btn.id;
                    if (finalId) {
                        builder.setCustomId(String(finalId));
                    }
                }
                return builder;
            });

            row.addComponents(components);
            this.rows.push(row);
        }
        return this;
    }

    /**
     * セレクトメニューを追加
     */
    addSelectMenu({ customId, options, placeholder, minValues, maxValues, disabled }) {
        const row = new ActionRowBuilder();
        const select = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder((placeholder || '選択してください').slice(0, 150))
            .addOptions(options.slice(0, 25).map(opt => ({
                label: String(opt.label).slice(0, 100),
                value: String(opt.value).slice(0, 100),
                description: opt.description?.slice(0, 100),
                default: !!opt.default,
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
        // Discord API 制限: 1メッセージ最大5行(ActionRows)
        return {
            embeds: [this.embed],
            components: this.rows.slice(0, 5)
        };
    }

    /**
     * オブジェクト定義からパネルを一括生成
     */
    static build(def) {
        const builder = new PanelBuilder()
            .setTitle(def.title)
            .setColor(def.color)
            .setDescription(def.description)
            .addFields(def.fields);

        if (def.footer) {
            if (typeof def.footer === 'string') builder.setFooter(def.footer);
            else builder.setFooter(def.footer.text, def.footer.iconURL);
        }

        if (def.thumbnail) builder.setThumbnail(def.thumbnail);
        if (def.image) builder.setImage(def.image);

        return builder;
    }
}

/**
 * 簡易ヘルパー
 * @param {object} options
 * @returns {import('discord.js').BaseMessageOptions}
 */
function buildPanel(options) {
    const builder = PanelBuilder.build(options);

    if (options.buttons) {
        // ネスト配列（複数行指定）でもフラット配列でも自動分割に任せる
        const flatButtons = Array.isArray(options.buttons[0])
            ? options.buttons.flat()
            : options.buttons;
        builder.addButtons(flatButtons);
    }

    if (options.selectMenu) {
        builder.addSelectMenu(options.selectMenu);
    }

    return builder.toJSON();
}

module.exports = {
    PanelBuilder,
    buildPanel
};
