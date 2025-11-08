const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

/**
 * くじ引き設定用のモーダルを作成する
 * @param {string} currentItems - 現在の設定項目（テキストエリアの初期値）
 * @returns {ModalBuilder}
 */
function createKujiSettingModal(currentItems = '') {
  const modal = new ModalBuilder()
    .setCustomId('kuji_setting_modal')
    .setTitle('くじ引き設定');

  const kujiItemsInput = new TextInputBuilder()
    .setCustomId('kuji_items_input')
    .setLabel('くじの項目（1行に1つ）')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(currentItems)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(kujiItemsInput));
  return modal;
}

module.exports = { createKujiSettingModal };