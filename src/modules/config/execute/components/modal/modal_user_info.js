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

const { updateUserInfo, readUserInfo } = require('../../../../../utils/config/gcsUserInfo.js');
const { sendSettingLog } = require('../../../../../utils/config/configLogger');
const { sendConfigPanel } = require('../../configPanel');
const {
  getRegistrationState,
  deleteRegistrationState,
} = require('../../select/user/registrationState.js');

module.exports = {
  customId: 'config_user_info_modal',

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
    } = state;

    if (!userId) {
      return interaction.update({
        content: '⚠️ ユーザー情報の取得に失敗しました。',
        components: [],
      });
    }

    const userInfo = await readUserInfo(interaction.guild.id, userId);

    const modal = new ModalBuilder()
      .setCustomId(`config_user_info_modal_${stateId}`)
      .setTitle('📝 ユーザー情報入力');

    const sns = new TextInputBuilder()
      .setCustomId('user_sns')
      .setLabel('SNS（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('@example / URL など')
      .setValue(userInfo?.sns || '');

    const address = new TextInputBuilder()
      .setCustomId('user_address')
      .setLabel('住所（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('住所 / 都道府県 / 市区町村')
      .setValue(userInfo?.address || '');

    const memo = new TextInputBuilder()
      .setCustomId('user_memo')
      .setLabel('備考（任意）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('必要な情報があれば記載')
      .setValue(userInfo?.memo || '');

    modal.addComponents(
      new ActionRowBuilder().addComponents(sns),
      new ActionRowBuilder().addComponents(address),
      new ActionRowBuilder().addComponents(memo),
    );

    return interaction.showModal(modal);
  },

  async handle(interaction) {
    const stateId = interaction.customId.replace('config_user_info_modal_', '');
    const state = getRegistrationState(stateId);
    if (!state) {
      return interaction.reply({
        content: '⚠️ セッションが期限切れです。再度最初から登録をやり直してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const {
      userId,
      storeName,
      positionId,
      year,
      month,
      day,
    } = state;

    const birthday = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    const sns = interaction.fields.getTextInputValue('user_sns') || '';
    const address = interaction.fields.getTextInputValue('user_address') || '';
    const memo = interaction.fields.getTextInputValue('user_memo') || '';

    const saveData = {
      name: interaction.guild.members.cache.get(userId)?.displayName || 'Unknown',
      store: storeName,
      position: positionId,
      birthday,
      sns,
      address,
      memo,
    };

    await updateUserInfo(interaction.guild.id, userId, saveData);

    const logMsg =
      `👤 **ユーザー情報が更新されました**\n` +
      `ユーザー：<@${userId}>\n` +
      `店舗：${storeName}\n` +
      `役職：${positionId}\n` +
      `誕生日：${birthday}\n` +
      `SNS：${sns}\n住所：${address}\n備考：${memo}\n`;

    await sendSettingLog(interaction.guild, {
      title: '👤 ユーザー情報更新',
      description: logMsg,
    });

    await interaction.reply({
      content: '✅ ユーザー情報を保存しました。',
      flags: MessageFlags.Ephemeral,
    });

    await sendConfigPanel(interaction.channel);
    deleteRegistrationState(stateId);
  },
};
