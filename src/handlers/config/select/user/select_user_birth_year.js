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
const { readUserInfo } = require('../../../../utils/config/gcsUserInfo');

module.exports = {
  customId: 'CONFIG_USER_SELECT_BIRTH_YEAR',

  /**
   * 年選択メニュー表示（2006〜1982）
   */
  async show(interaction, userId, storeName, positionId) {
    // --- 既存の誕生日情報を読み込む ---
    const userInfo = await readUserInfo(interaction.guild.id, userId);

    // --- 2つの年の範囲を生成 ---
    const years1 = Array.from({ length: 2006 - 1982 + 1 }, (_, i) => String(2006 - i));
    const years2 = Array.from({ length: 1981 - 1957 + 1 }, (_, i) => String(1981 - i));

    // --- メニュー1 (2006〜1982) ---
    const menu1 = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_${userId}_${storeName}_${positionId}`
      )
      .setPlaceholder('生まれた年を選択してください (2006〜1982年)')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years1.map((y) => ({
        label: y, 
        value: y,
        default: userInfo?.birthday?.startsWith(y)
      })));

    // --- メニュー2 (1981〜1957) ---
    const menu2 = new StringSelectMenuBuilder()
      .setCustomId(
        `CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_${userId}_${storeName}_${positionId}`
      )
      .setPlaceholder('生まれた年を選択してください (1981〜1957年)')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(years2.map((y) => ({
        label: y,
        value: y,
        default: userInfo?.birthday?.startsWith(y)
      })));

    const components = [
      new ActionRowBuilder().addComponents(menu1),
      new ActionRowBuilder().addComponents(menu2)
    ];

    // --- 既存の誕生日が設定済みの場合、「次へ」ボタンを追加 ---
    if (userInfo?.birthday) {
      const [year, month, day] = userInfo.birthday.split('-');
      const nextButton = new ButtonBuilder()
        .setCustomId(`CONFIG_USER_GOTO_USERINFO_${userId}_${storeName}_${positionId}_${year}_${month}_${day}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);
      
      const row3 = new ActionRowBuilder().addComponents(nextButton);
      components.push(row3);
    }

    await interaction.update({
      content: `🎂 生まれた「年」を選択してください。\nユーザー：<@${userId}>\n店舗：${storeName} / 役職：${positionId}` +
        (userInfo?.birthday ? `\n（現在 **${userInfo.birthday}** が設定されています）` : ''),
      components: components,
    });
  },

  /**
   * 年選択後 → Step4-2（誕生月）へ
   */
  async handle(interaction) {
    const isExtra = interaction.customId.includes('_EXTRA_');
    const prefix = isExtra ? 'CONFIG_USER_SELECT_BIRTH_YEAR_EXTRA_' : 'CONFIG_USER_SELECT_BIRTH_YEAR_';
    const raw = interaction.customId.replace(prefix, '');
    const customIdParts = raw.split('_');

    const userId = customIdParts[0];
    const storeName = customIdParts[1];
    const positionId = customIdParts.slice(2).join('_'); // 役職名に_が含まれる場合を考慮
    const year = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year, isExtra);
  },
};
