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
    const years = Array.from({ length: 1981 - 1957 + 1 }, (_, i) =>
      String(1981 - i)
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_${userId}_${storeName}_${positionId}`
      )
      .setPlaceholder('生まれた年を選択してください（1981〜1957）')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years.map((y) => ({ label: y, value: y })));

    return interaction.update({
      content:
        `🎂 **生まれた「年」を選択してください（1981〜1957）**\n` +
        `ユーザー：<@${userId}>\n店舗：${storeName} / 役職：${positionId}`,
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  },

  /**
   * 年選択後 → Step4-2（誕生月）
   */
  async handle(interaction) {
    // CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_user_store_position
    const raw = interaction.customId.replace(
      'CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_',
      ''
    );

    const parts = raw.split('_');

    const userId = parts.shift();     // 先頭
    const storeName = parts.shift();  // 次
    const positionId = parts.join('_'); // 残り全部が役職
    const year = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year, true);
  },
};
