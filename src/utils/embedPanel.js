// src/utils/embedPanel.js
const { EmbedBuilder } = require('discord.js');

/**
 * 設定パネル用の標準 Embed（説明文なし）
 * @param {string} title
 * @param {Array<{name: string, value: string}>} fields
 * @param {number} [color]
 */
function createSettingPanelEmbed(title, fields, color = 0x00b894) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();

  return embed;
}

module.exports = {
  createSettingPanelEmbed,
};