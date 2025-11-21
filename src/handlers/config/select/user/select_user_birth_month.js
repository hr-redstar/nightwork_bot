// src/handlers/config/components/select/user/select_user_birth_month.js
// ----------------------------------------------------
// Step4-2：誕生日 月（1〜12）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const nextStep = require('./select_user_birth_day.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_BIRTH_MONTH',

  /**
   * 月選択メニュー表示（1〜12）
   */
  async show(interaction, userId, storeName, positionId, year) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push(m.toString());
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_MONTH_${userId}_${storeName}_${positionId}_${year}`
      )
      .setPlaceholder('生まれた月を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(months.map((m) => ({ label: m, value: m })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content:
        `🎂 **生年月日の選択（2/3）**\n` +
        `年：${year}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}`,
      components: [row],
    });
  },

  /**
   * 月選択後 → Step4-3（日選択）
   */
  async handle(interaction) {
    // CONFIG_USER_SELECT_BIRTH_MONTH_<userId>_<storeName>_<positionId>_<year>
    const parts = interaction.customId.replace('CONFIG_USER_SELECT_BIRTH_MONTH_', '').split('_');

    const userId = parts[0];
    const storeName = parts[1];
    const positionId = parts[2];
    const year = parts[3];

    const month = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year, month);
  },
};
