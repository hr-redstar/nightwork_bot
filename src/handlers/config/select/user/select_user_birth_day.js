// src/handlers/config/components/select/user/select_user_birth_day.js
// ----------------------------------------------------
// Step4-3：誕生日 日（1〜31固定）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const nextStep = require('../../components/modal/modal_user_info.js');

module.exports = {
  customId: 'CONFIG_USER_SELECT_BIRTH_DAY',

  /**
   * 日選択メニュー表示（1〜31）
   */
  async show(interaction, userId, storeName, positionId, year, month) {
    const days = [];
    for (let d = 1; d <= 31; d++) {
      days.push(d.toString());
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_DAY_${userId}_${storeName}_${positionId}_${year}_${month}`
      )
      .setPlaceholder('生まれた日を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(days.map((d) => ({ label: d, value: d })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content:
        `🎂 **生年月日の選択（3/3）**\n` +
        `年：${year} / 月：${month}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}`,
      components: [row],
    });
  },

  /**
   * 日選択後 → Step4-4（SNS・住所・備考 モーダル）
   */
  async handle(interaction) {
    // CONFIG_USER_SELECT_BIRTH_DAY_<userId>_<storeName>_<positionId>_<year>_<month>
    const parts = interaction.customId.replace('CONFIG_USER_SELECT_BIRTH_DAY_', '').split('_');

    const userId = parts[0];
    const storeName = parts[1];
    const positionId = parts[2];
    const year = parts[3];
    const month = parts[4];

    const day = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year, month, day);
  },
};
