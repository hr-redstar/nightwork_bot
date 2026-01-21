// src/modules/common/utils/embed/buildBaseEmbed.js

const { EmbedBuilder } = require('discord.js');
const getBotFooter = require('./getBotFooter');
const getEmbedColor = require('./getEmbedColor');

module.exports = function buildBaseEmbed({
  interaction,
  functionKey,
  guildConfig,
  title,
  description,
  fields = [],
  color,
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color ?? getEmbedColor(functionKey, guildConfig))
    .setFooter(getBotFooter(interaction))
    .setTimestamp();

  if (fields.length) embed.addFields(fields);

  return embed;
};
