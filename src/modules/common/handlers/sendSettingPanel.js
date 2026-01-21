// src/modules/common/handlers/sendSettingPanel.js

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

const buildBaseEmbed = require('../utils/embed/buildBaseEmbed');

module.exports = async function sendSettingPanel({
  interaction,
  functionKey = 'common',
  guildConfig,
  title,
  description,
  fields = [],
  buttons = [],
  color,
  ephemeral = true,
}) {
  const embed = buildBaseEmbed({
    interaction,
    functionKey,
    guildConfig,
    title,
    description,
    fields,
    color,
  });

  const components = [];

  if (buttons.length) {
    components.push(
      new ActionRowBuilder().addComponents(
        buttons.map(b =>
          new ButtonBuilder()
            .setCustomId(b.customId)
            .setLabel(b.label)
            .setStyle(b.style ?? ButtonStyle.Secondary)
            .setDisabled(b.disabled ?? false)
        )
      )
    );
  }

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [embed], components });
  }

  return interaction.reply({
    embeds: [embed],
    components,
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
};
