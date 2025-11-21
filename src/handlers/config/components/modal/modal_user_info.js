// src/handlers/config/components/modal/modal_user_info.js
// ----------------------------------------------------
// Step4-4：ユーザー情報入力（SNS / 住所 / 備考）
// ----------------------------------------------------

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const { saveUserInfo } = require('../../../../utils/config/gcsUserInfo.js');
const { sendSettingLog } = require('../../configLogger');
const { postConfigPanel } = require('../../configPanel');

module.exports = {
  customId: 'CONFIG_USER_INFO_MODAL',

  /**
   * モーダルを開く
   */
  async show(interaction, userId, storeName, positionId, year, month, day) {
    const modal = new ModalBuilder()
      .setCustomId(
        `CONFIG_USER_INFO_MODAL_${userId}_${storeName}_${positionId}_${year}_${month}_${day}`
      )
      .setTitle('📝 ユーザー情報入力');

    // SNS
    const sns = new TextInputBuilder()
      .setCustomId('user_sns')
      .setLabel('SNS（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('@example / URL など');

    // 住所
    const address = new TextInputBuilder()
      .setCustomId('user_address')
      .setLabel('住所（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('住所 / 都道府県 / 市区町村');

    // 備考
    const memo = new TextInputBuilder()
      .setCustomId('user_memo')
      .setLabel('備考（任意）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('必要な情報があれば記入');

    modal.addComponents(
      new ActionRowBuilder().addComponents(sns),
      new ActionRowBuilder().addComponents(address),
      new ActionRowBuilder().addComponents(memo),
    );

    return interaction.showModal(modal);
  },

  /**
   * モーダル送信後 → ユーザー情報を保存
   */
  async handle(interaction) {
    // CONFIG_USER_INFO_MODAL_<userId>_<storeName>_<positionId>_<year>_<month>_<day>
    const parts = interaction.customId.replace('CONFIG_USER_INFO_MODAL_', '').split('_');

    const userId = parts[0];
    const storeName = parts[1];
    const positionId = parts[2];
    const year = parts[3];
    const month = parts[4];
    const day = parts[5];

    const birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // モーダル入力値取得
    const sns = interaction.fields.getTextInputValue('user_sns') || '';
    const address = interaction.fields.getTextInputValue('user_address') || '';
    const memo = interaction.fields.getTextInputValue('user_memo') || '';

    // 保存
    await saveUserInfo(interaction.guild.id, {
      id: userId,
      name: interaction.guild.members.cache.get(userId)?.displayName || 'Unknown',
      store: storeName,
      position: positionId,
      birthday,
      sns,
      address,
      memo,
    });

    // ログ出力
    const logMsg =
      `👤 **ユーザー情報が更新されました**\n` +
      `ユーザー：<@${userId}>\n` +
      `店舗：${storeName}\n` +
      `役職：${positionId}\n` +
      `誕生日：${birthday}\n` +
      `SNS：${sns}\n住所：${address}\n備考：${memo}\n`;

    await sendSettingLog(interaction.guild, {
      user: interaction.user,
      message: logMsg,
      type: 'ユーザー情報更新',
    });

    await interaction.reply({
      content: '✅ ユーザー情報を保存しました。',
      flags: MessageFlags.Ephemeral,
    });

    // 設定パネル更新
    await postConfigPanel(interaction.channel);
  },
};
