// src/handlers/config/components/select/user/select_user_birth_day.js
// ----------------------------------------------------
// Step4-3：誕生日 日選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('../../components/modal/modal_user_info.js');
const {
  getRegistrationState,
  updateRegistrationState,
} = require('./registrationState.js');

module.exports = {
  customId: 'config_user_select_birth_day',

  async show(interaction, stateId) {
    const state = getRegistrationState(stateId);
    if (!state) {
      return interaction.update({
        content: '⏳ セッションが期限切れです。再度最初から登録をやり直してください。',
        components: [],
      });
    }

    const {
      userId,
      storeName,
      positionId,
      year,
      month,
      day: savedDay,
    } = state;

    if (!userId || !storeName || !positionId || !year || !month) {
      return interaction.update({
        content: '⚠️ 日の情報が不足しています。設定パネルから再度操作してください。',
        components: [],
      });
    }

    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const dayOptions = Array.from({ length: lastDay }, (_, i) => {
      const value = (i + 1).toString();
      return {
        label: `${value}日`,
        value,
        default: Number(savedDay) === i + 1,
      };
    });

    const baseCustomId = `config_user_select_birth_day_${stateId}`;
    const components = [];

    if (dayOptions.length > 25) {
      const menu1 = new StringSelectMenuBuilder()
        .setCustomId(`${baseCustomId}_part1`)
        .setPlaceholder('生まれた日を選択してください (1〜25日)')
        .addOptions(dayOptions.slice(0, 25));
      components.push(new ActionRowBuilder().addComponents(menu1));

      const menu2 = new StringSelectMenuBuilder()
        .setCustomId(`${baseCustomId}_part2`)
        .setPlaceholder('生まれた日を選択してください (26〜31日)')
        .addOptions(dayOptions.slice(25));
      components.push(new ActionRowBuilder().addComponents(menu2));
    } else {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(baseCustomId)
        .setPlaceholder('生まれた日を選択してください')
        .addOptions(dayOptions);
      components.push(new ActionRowBuilder().addComponents(menu));
    }

    if (savedDay) {
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_userinfo_${stateId}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);

      components.push(new ActionRowBuilder().addComponents(nextButton));
    }

    await interaction.update({
      content:
        `🎂 **生年月日の選択（3/3）**\n` +
        `年：${year} / 月：${month}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}` +
        (savedDay ? `\n（現在 **${year}-${month}-${savedDay}** が設定されています）` : ''),
      components,
    });
  },

  async handle(interaction) {
    const prefix = 'config_user_select_birth_day_';
    const baseId = interaction.customId.replace(/_part\d$/, '');
    const stateId = baseId.replace(prefix, '');
    const day = interaction.values[0];
    updateRegistrationState(stateId, { day });

    return nextStep.show(interaction, stateId);
  },
};
