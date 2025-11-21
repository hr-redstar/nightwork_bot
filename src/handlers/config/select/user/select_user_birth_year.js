// src/handlers/config/components/select/user/select_user_birth_year.js
// ----------------------------------------------------
// Step4-1：誕生日 年（2006〜1982）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('./select_user_birth_month.js');
const extraYearStep = require('./select_user_birth_year_extra.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_BIRTH_YEAR',

  /**
   * 年選択メニュー表示（2006〜1982）
   */
  async show(interaction, userId, storeName, positionId) {
    const years = [];
    for (let y = 2006; y >= 1982; y--) {
      years.push(y.toString());
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_${userId}_${storeName}_${positionId}`
      )
      .setPlaceholder('生まれた年を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years.map((y) => ({ label: y, value: y })));

    const row = new ActionRowBuilder().addComponents(menu);

    // --- 追加年範囲ボタン（1981〜1957） ---
    const extraButton = new ButtonBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_${userId}_${storeName}_${positionId}`
      )
      .setLabel('1981〜1957 を選ぶ')
      .setStyle(ButtonStyle.Secondary);

    const row2 = new ActionRowBuilder().addComponents(extraButton);

    await interaction.update({
      content: `🎂 生まれた「年」を選択してください。\nユーザー：<@${userId}>\n店舗：${storeName} / 役職ID：${positionId}`,
      components: [row, row2],
    });
  },

  /**
   * 年選択後 → Step4-2（誕生月）へ
   */
  async handle(interaction) {
    const [_, __, userId, storeName, positionId] = interaction.customId.split('_');
    const year = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year);
  },
};
