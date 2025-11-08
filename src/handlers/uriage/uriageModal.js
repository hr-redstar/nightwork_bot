const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

/**
 * 売上報告モーダルを表示
 * @param {Interaction} interaction - ボタン押下のInteraction
 * @param {string} storeName - 対象店舗名
 */
async function showUriageModal(interaction, storeName) {
  const modal = new ModalBuilder()
    .setCustomId(`uriage_modal_submit_${storeName}`)
    .setTitle(`💰 売上報告：${storeName}`);

  const dateInput = new TextInputBuilder()
    .setCustomId('date')
    .setLabel('日付（例：2025-11-07）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('YYYY-MM-DD')
    .setRequired(true);

  const totalInput = new TextInputBuilder()
    .setCustomId('total')
    .setLabel('総売上（円）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例：250000')
    .setRequired(true);

  const cashInput = new TextInputBuilder()
    .setCustomId('cash')
    .setLabel('現金（円）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例：150000')
    .setRequired(true);

  const cardInput = new TextInputBuilder()
    .setCustomId('card')
    .setLabel('カード（円）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例：80000')
    .setRequired(true);

  const costInput = new TextInputBuilder()
    .setCustomId('expense')
    .setLabel('諸経費（円）')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('例：20000')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(totalInput),
    new ActionRowBuilder().addComponents(cashInput),
    new ActionRowBuilder().addComponents(cardInput),
    new ActionRowBuilder().addComponents(costInput)
  );

  await interaction.showModal(modal);
}

module.exports = { showUriageModal };
