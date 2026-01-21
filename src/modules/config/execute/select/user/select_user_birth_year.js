// src/handlers/config/components/select/user/select_user_birth_year.js
// ----------------------------------------------------
// Step4-1：誕生日 年選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('./select_user_birth_month.js');
const { readUserInfo } = require('../../../../../utils/config/gcsUserInfo');
const {
  getRegistrationState,
  updateRegistrationState,
} = require('./registrationState.js');

module.exports = {
  customId: 'config_user_select_birth_year',

  async show(interaction, stateId) {
    const state = getRegistrationState(stateId);
    if (!state) {
      return interaction.update({
        content: '⏳ セッションが期限切れです。再度最初から登録をやり直してください。',
        components: [],
      });
    }

    const { userId, storeName, positionId } = state;
    if (!userId || !storeName || !positionId) {
      return interaction.update({
        content: '⚠️ ユーザー情報が不足しています。設定パネルから再度操作してください。',
        components: [],
      });
    }

    const guildId = interaction.guild.id;
    const userInfo = await readUserInfo(guildId, userId);

    const years1 = Array.from({ length: 2006 - 1982 + 1 }, (_, i) => String(2006 - i));
    const years2 = Array.from({ length: 1981 - 1957 + 1 }, (_, i) => String(1981 - i));

    const baseCustomId = `config_user_select_birth_year_${stateId}`;

    const menu1 = new StringSelectMenuBuilder()
      .setCustomId(`${baseCustomId}_part1`)
      .setPlaceholder('生まれた年を選択してください (2006〜1982年)')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years1.map((y) => ({
        label: y,
        value: y,
        default: userInfo?.birthday?.startsWith(y),
      })));

    const menu2 = new StringSelectMenuBuilder()
      .setCustomId(`${baseCustomId}_part2`)
      .setPlaceholder('生まれた年を選択してください (1981〜1957年)')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years2.map((y) => ({
        label: y,
        value: y,
        default: userInfo?.birthday?.startsWith(y),
      })));

    const components = [
      new ActionRowBuilder().addComponents(menu1),
      new ActionRowBuilder().addComponents(menu2),
    ];

    if (userInfo?.birthday) {
      const [year, month, day] = userInfo.birthday.split('-');
      updateRegistrationState(stateId, { year, month, day });
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_userinfo_${stateId}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);

      components.push(new ActionRowBuilder().addComponents(nextButton));
    }

    await interaction.update({
      content:
        `🎂 生まれた「年」を選択してください。\nユーザー：<@${userId}>\n店舗：${storeName} / 役職：${positionId}` +
        (userInfo?.birthday ? `\n（現在 **${userInfo.birthday}** が設定されています）` : ''),
      components,
    });
  },

  async handle(interaction) {
    const prefix = 'config_user_select_birth_year_';
    const raw = interaction.customId.replace(prefix, '');
    const stateId = raw.replace(/_part\d$/, '');
    const year = interaction.values[0];

    updateRegistrationState(stateId, { year, month: null, day: null });

    return nextStep.show(interaction, stateId);
  },
};
