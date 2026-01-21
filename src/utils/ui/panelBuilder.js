const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

function buildPanel({ title, description, fields = [], buttons = [] }) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (fields.length) {
        embed.addFields(fields);
    }

    const rows = [];
    if (buttons.length) {
        rows.push(
            new ActionRowBuilder().addComponents(
                buttons.map(b =>
                    new ButtonBuilder()
                        .setCustomId(b.id)
                        .setLabel(b.label)
                        .setStyle(b.style)
                )
            )
        );
    }

    return { embeds: [embed], components: rows };
}

module.exports = {
    buildPanel,
};
