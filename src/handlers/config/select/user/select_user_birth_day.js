// src/handlers/config/components/select/user/select_user_birth_day.js
// ----------------------------------------------------
// Step4-3：誕生日 日（1〜31固定）
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const nextStep = require('../../components/modal/modal_user_info.js');
const { readUserInfo } = require('../../../../utils/config/gcsUserInfo.js');

module.exports = {
  customId: 'config_user_select_birth_day',

  /**
   * 日選択メニュー表示（1〜31）
   */
  async show(interaction, userId, storeName, positionId, year, month, isExtra = false) { // isExtra を受け取る
    const userInfo = await readUserInfo(interaction.guild.id, userId);
    const savedDay = userInfo?.birthday?.split('-')[2];

    // その月の最終日を正しく計算 (JSの月は0-11)
    const lastDay = new Date(Number(year), Number(month), 0).getDate();

    const dayOptions = Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      return {
        label: `${day}日`,
        value: day.toString(), // valueは必ず文字列にする
        default: Number(savedDay) === day,
      };
    });

    const components = [];
    const baseCustomId = isExtra
      ? `config_user_select_birth_day_extra_${userId}_${storeName}_${positionId}_${year}_${month}`
      : `config_user_select_birth_day_${userId}_${storeName}_${positionId}_${year}_${month}`;

    // 選択肢が25を超える場合はメニューを分割する
    if (dayOptions.length > 25) {
      const menu1 = new StringSelectMenuBuilder()
        .setCustomId(`${baseCustomId}_1`)
        .setPlaceholder('生まれた日を選択してください (1〜25日)')
        .addOptions(dayOptions.slice(0, 25));
      components.push(new ActionRowBuilder().addComponents(menu1));

      const menu2 = new StringSelectMenuBuilder()
        .setCustomId(`${baseCustomId}_2`)
        .setPlaceholder('生まれた日を選択してください (26日〜)')
        .addOptions(dayOptions.slice(25));
      components.push(new ActionRowBuilder().addComponents(menu2));
    } else {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(baseCustomId)
        .setPlaceholder('生まれた日を選択してください')
        .addOptions(dayOptions);
      components.push(new ActionRowBuilder().addComponents(menu));
    }

    // --- 既存の誕生日が設定済みの場合、「次へ」ボタンを追加 ---
    if (userInfo?.birthday) {
      const [savedYear, savedMonth, savedDay] = userInfo.birthday.split('-');
      const nextButton = new ButtonBuilder()
        .setCustomId(`config_user_goto_userinfo_${userId}_${storeName}_${positionId}_${savedYear}_${savedMonth}_${savedDay}`)
        .setLabel('この生年月日で決定')
        .setStyle(ButtonStyle.Success);
      
      const rowNext = new ActionRowBuilder().addComponents(nextButton);
      components.push(rowNext);
    }

    return interaction.update({
      content:
        `🎂 **生年月日の選択（3/3）**\n` +
        `年：${year} / 月：${month}\n` +
        `ユーザー：<@${userId}> / 店舗：${storeName} / 役職：${positionId}` +
        (userInfo?.birthday ? `\n（現在 **${userInfo.birthday}** が設定されています）` : ''),
      components: components,
    });
  },

  /**
   * 日選択後 → Step4-4（SNS・住所・備考 モーダル）
   */
  async handle(interaction) {
    const isExtra = interaction.customId.includes('_extra_'); // EXTRAフローか判定
    const prefix = isExtra ? 'config_user_select_birth_day_extra_' : 'config_user_select_birth_day_';
    const baseCustomId = interaction.customId.replace(/_(\d)$/, ''); // _1 or _2 を除去
    const customIdParts = baseCustomId.replace(prefix, '').split('_');

    const userId = customIdParts[0];
    const month = customIdParts[customIdParts.length - 1]; // 月は最後
    const year = customIdParts[customIdParts.length - 2]; // 年は最後から2番目
    const storeName = customIdParts[1];
    const positionId = customIdParts.slice(2, -2).join('_'); // 役職名は中間

    const day = interaction.values[0];

    return nextStep.show(interaction, userId, storeName, positionId, year, month, day, isExtra); // isExtra を引き継ぐ
  },
};
