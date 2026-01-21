// ----------------------------------------------------
// Step4-2：誕生日 月選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('./select_user_birth_day.js');
const {
  getRegistrationState,
  updateRegistrationState,
} = require('./registrationState.js');

module.exports = {
  customId: 'config_user_select_birth_month',

  async show(interaction, stateId) {
    const state = getRegistrationState(stateId);
    if (!state) {
      return interaction.update({
        content: '⏳ セッションが期限切れです。再度最初から登録をやり直してください。',
        components: [],
      });
    }

    const { userId, storeName, positionId, year, month: savedMonth, day } = state;
    if (!userId || !storeName || !positionId || !year) {
      return interaction.update({
        content: '⚠️ 年の情報が不足しています。設定パネルから再度操作してください。',
        components: [],
      });
    }

    const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const customId = `config_user_select_birth_month_${stateId}`;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('生まれた月を選択してください')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(months.map((m) => ({
        label: `${m}月`,
        value: m,
        default: Number(savedMonth) === Number(m),
      })));

    const components = [new ActionRowBuilder().addComponents(menu)];

    if (year && savedMonth && day) {
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_userinfo_${stateId}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);

      components.push(new ActionRowBuilder().addComponents(nextButton));
    }

    return interaction.update({
      content:
        `🎂 **生年月日の選択（2/3）**\n` +
        `年：${year}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}` +
        (savedMonth && day ? `\n（現在 **${year}-${savedMonth}-${day}** が設定されています）` : ''),
      components,
    });
  },

  async handle(interaction) {
    const stateId = interaction.customId.replace('config_user_select_birth_month_', '');
    const month = interaction.values[0];
    updateRegistrationState(stateId, { month, day: null });

    return nextStep.show(interaction, stateId);
  },
};
