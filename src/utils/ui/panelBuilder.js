const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

function buildPanel({ title, description, fields = [], buttons = [], color = null }) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || null)
        .setTimestamp();

    if (color) {
        embed.setColor(color);
    }

    if (fields.length) {
        embed.addFields(fields);
    }

    const rows = [];
    if (buttons.length) {
        // 2次元配列 (行指定あり) か 1次元配列 (自動) か判定
        const isMultiRow = Array.isArray(buttons[0]);
        const buttonRows = isMultiRow ? buttons : [buttons];

        for (const rowButtons of buttonRows) {
            if (!rowButtons.length) continue;
            // Discord limits: 5 buttons per row
            // If row has > 5, we should warn or chunk? For now assuming caller handles layout or strict isMultiRow
            // If explicit rows, we respect them (error if >5 caught by discord.js)

            rows.push(
                new ActionRowBuilder().addComponents(
                    rowButtons.map(b =>
                        new ButtonBuilder()
                            .setCustomId(b.id)
                            .setLabel(b.label)
                            .setStyle(b.style)
                            .setDisabled(!!b.disabled)
                            .setEmoji(b.emoji || undefined)
                    )
                )
            );
        }
    }

    return { embeds: [embed], components: rows };
}

module.exports = {
    buildPanel,
};
