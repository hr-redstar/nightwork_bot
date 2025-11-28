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

const { updateUserInfo, readUserInfo } = require('../../../../utils/config/gcsUserInfo.js');
const { sendSettingLog } = require('../../configLogger');
const { sendConfigPanel } = require('../../configPanel');

module.exports = {
  customId: 'CONFIG_USER_INFO_MODAL',

  /**
   * モーダルを開く
   */
  async show(interaction, userId, storeName, positionId, year, month, day, isExtra = false) {
    const customId = isExtra
      ? `CONFIG_USER_INFO_MODAL_EXTRA_${userId}_${storeName}_${positionId}_${year}_${month}_${day}`
      : `CONFIG_USER_INFO_MODAL_${userId}_${storeName}_${positionId}_${year}_${month}_${day}`;

    // --- 既存のユーザー情報を読み込む ---
    const userInfo = await readUserInfo(interaction.guild.id, userId);

    const modal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle('📝 ユーザー情報入力');

    // SNS
    const sns = new TextInputBuilder()
      .setCustomId('user_sns')
      .setLabel('SNS（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('@example / URL など')
      .setValue(userInfo?.sns || '');

    // 住所
    const address = new TextInputBuilder()
      .setCustomId('user_address')
      .setLabel('住所（任意）')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('住所 / 都道府県 / 市区町村')
      .setValue(userInfo?.address || '');

    // 備考
    const memo = new TextInputBuilder()
      .setCustomId('user_memo')
      .setLabel('備考（任意）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('必要な情報があれば記入')
      .setValue(userInfo?.memo || '');

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
    // CONFIG_USER_INFO_MODAL or CONFIG_USER_INFO_MODAL_EXTRA
    const id = interaction.customId;

    // EXTRA が前に付くケースを排除して分解
    const raw = id
      .replace('CONFIG_USER_INFO_MODAL_EXTRA_', '')
      .replace('CONFIG_USER_INFO_MODAL_', '');

    const parts = raw.split('_');

    // 正しい順番で取り出し（必ず後ろから固定）
    const day = parts.pop();
    const month = parts.pop();
    const year = parts.pop();
    const userId = parts.shift();
    const storeName = parts.shift();
    const positionId = parts.join('_');

    const birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // モーダル入力値取得
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

    // 保存
    await updateUserInfo(interaction.guild.id, userId, saveData);

    // ログ出力
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

    // 設定パネル更新
    await sendConfigPanel(interaction.channel);
  },
};
