// ----------------------------------------------------
// Step4-2：誕生日 月（1〜12）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('./select_user_birth_day.js');
const { readUserInfo } = require('../../../../utils/config/gcsUserInfo.js');

module.exports = {
  customId: 'config_user_select_birth_month',

  /**
   * 月選択メニュー表示（1〜12）
   */
  async show(interaction, userId, storeName, positionId, year, isExtra = false) {
    const userInfo = await readUserInfo(interaction.guild.id, userId);
    const savedMonth = userInfo?.birthday?.split('-')[1];

    const months = Array.from({ length: 12 }, (_, i) => String(i + 1));

    const customId = isExtra
      ? `config_user_select_birth_month_extra_${userId}_${storeName}_${positionId}_${year}`
      : `config_user_select_birth_month_${userId}_${storeName}_${positionId}_${year}`;

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

    // --- 既存の誕生日が設定済みの場合、「次へ」ボタンを追加 ---
    if (userInfo?.birthday) {
      const [savedYear, savedMonth, savedDay] = userInfo.birthday.split('-');
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_userinfo_${userId}_${storeName}_${positionId}_${savedYear}_${savedMonth}_${savedDay}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);
      
      const row2 = new ActionRowBuilder().addComponents(nextButton);
      components.push(row2);
    }

    return interaction.update({
      content:
        `🎂 **生年月日の選択（2/3）**\n` +
        `年：${year}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}` +
        (userInfo?.birthday ? `\n（現在 **${userInfo.birthday}** が設定されています）` : ''),
      components: components,
    });
  },

  /**
   * 月選択後 → Step4-3（日選択）
   */
  async handle(interaction) {
    const isExtra = interaction.customId.includes('_extra_'); // EXTRAフローか判定
    const prefix = isExtra ? 'config_user_select_birth_month_extra_' : 'config_user_select_birth_month_';
    const raw = interaction.customId.replace(prefix, '');

    const parts = raw.split('_');

    const userId = parts.shift();    // 先頭
    const storeName = parts.shift(); // 次
    const year = parts.pop();        // 最後
    const positionId = parts.join('_'); // 残り全部

    const month = interaction.values[0]; // 選択月

    return nextStep.show(interaction, userId, storeName, positionId, year, month, isExtra); // isExtra を引き継ぐ
  },
};
