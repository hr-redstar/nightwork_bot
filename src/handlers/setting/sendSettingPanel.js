// src/handlers/setting/common/sendSettingPanel.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');

/**
 * 共通 設定パネル送信処理
 *
 * @param {Object} options
 * @param {Interaction} options.interaction
 * @param {string} options.title            Embedタイトル
 * @param {string} options.description      Embed説明文
 * @param {Array}  options.fields           Embed fields
 * @param {Array}  options.buttons          ボタン定義配列
 * @param {boolean} [options.ephemeral=true]
 */
module.exports = async function sendSettingPanel({
  interaction,
  title,
  description,
  fields = [],
  buttons = [],
  ephemeral = true,
}) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x2b2d31);

  if (fields.length) {
    embed.addFields(fields);
  }

  const rows = [];
  if (buttons.length) {
    rows.push(
      new ActionRowBuilder().addComponents(
        buttons.map((btn) =>
          new ButtonBuilder()
            .setCustomId(btn.customId)
            .setLabel(btn.label)
            .setStyle(btn.style ?? ButtonStyle.Secondary)
            .setDisabled(btn.disabled ?? false)
        )
      )
    );
  }

  // interaction 状態を吸収
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      embeds: [embed],
      components: rows,
    });
  }

  return interaction.reply({
    embeds: [embed],
    components: rows,
    flags: ephemeral ? MessageFlags.Ephemeral : undefined,
  });
};
