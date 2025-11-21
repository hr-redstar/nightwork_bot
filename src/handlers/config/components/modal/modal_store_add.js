// src/handlers/config/components/modal/modal_store_add.js
// ----------------------------------------------------
// 🏪 店舗追加モーダル
// ----------------------------------------------------

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  customId: 'CONFIG_STORE_ADD_MODAL',

  /**
   * モーダルを表示
   */
  show(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('CONFIG_STORE_ADD_MODAL')
      .setTitle('🏪 店舗を追加');

    const input = new TextInputBuilder()
      .setCustomId('storeName')
      .setLabel('追加する店舗名を入力してください')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例：店舗A')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  },

  /**
   * モーダル送信後の処理
   */
  async handle(interaction) {
    const storeName = interaction.fields.getTextInputValue('storeName');

    const { addStore } = require('../../../../utils/config/storeRoleConfigManager');

    await addStore(interaction.guild.id, storeName);

    await interaction.reply({
      content: `🏪 店舗 **${storeName}** を追加しました！`,
      ephemeral: true,
    });
  },
};
