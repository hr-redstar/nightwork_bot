// src/handlers/config/components/select/user/select_user_birth_year_extra.js
// ----------------------------------------------------
// Step4-1b：誕生日 年（1981〜1957）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const nextStep = require('./select_user_birth_month.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA',

  /**
   * 年選択（1981〜1957）を表示
   */
  async show(interaction, userId, storeName, positionId) {
    const years = [];
    for (let y = 1981; y >= 1957; y--) {
      years.push(y.toString());
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_${userId}_${storeName}_${positionId}`
      )
      .setPlaceholder('生まれた年を選択してください（1981〜1957）')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years.map((y) => ({ label: y, value: y })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content: `🎂 生まれた「年」を選択してください。\nユーザー：<@${userId}>\n店舗：${storeName} / 役職ID：${positionId}`,
      components: [row],
    });
  },

  /**
   * 年選択後 → Step4-2（誕生月）
   */
  async handle(interaction) {
    // CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_<userId>_<storeName>_<positionId>
    const parts = interaction.customId.replace('CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_', '').split('_');

    const userId = parts[0];
    const storeName = parts[1];
    const positionId = parts.slice(2).join('_'); // positionが _ を含む可能性

    const year = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year);
  },
};
