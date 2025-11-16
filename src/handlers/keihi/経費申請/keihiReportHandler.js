// src/handlers/keihi/経費申請/keihiReportHandler.js
// 経費申請・承認・修正のロジック

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const dayjs = require('dayjs');
const { getKeihiConfig, saveKeihiConfig } = require('../../../utils/keihi/gcsKeihiManager');
const { IDS } = require('../経費設定/ids');
const { sendSettingLog } = require('../../../utils/keihi/embedLogger');

/**
 * 経費申請モーダルを開く
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function openKeihiReportModal(interaction) {
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  const storeName = parts[3]; // Assuming the storeName is the 4th part after splitting by ':' or '_'
  const config = await getKeihiConfig(interaction.guild.id);
  const items = config.storeItems?.[storeName] || [];

  if (items.length === 0) {
    return interaction.reply({ content: `⚠️ **${storeName}** には経費項目が設定されていません。`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`keihi:modal:report:${storeName}`)
    .setTitle(`💼 ${storeName} 経費申請`);

  const itemSelect = new ActionRowBuilder().addComponents(
    new (require('discord.js').StringSelectMenuBuilder)()
      .setCustomId('temp_item_select') // This ID is temporary for the modal
      .setPlaceholder('経費項目を選択')
      .addOptions(items.map(item => ({ label: item, value: item })))
  );

  const amountInput = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('amount')
      .setLabel('金額（円）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
  );

  const noteInput = new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('note')
      .setLabel('備考（任意）')
      .setStyle(TextInputStyle.Paragraph)
  );

  // Note: Modals do not support select menus. We must ask for the item as text.
  const itemInput = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item')
        .setLabel(`経費項目 (${items.join('/')})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
  );

  modal.addComponents(itemInput, amountInput, noteInput);
  await interaction.showModal(modal);
}

/**
 * 経費申請モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleReportSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guild.id;
  const rawId = interaction.customId || '';
  const parts = rawId.includes(':') ? rawId.split(':') : rawId.split('_');
  const storeName = parts[3]; // Assuming the storeName is the 4th part after splitting by ':' or '_'
  const item = interaction.fields.getTextInputValue('item');
  const amount = parseInt(interaction.fields.getTextInputValue('amount'), 10);
  const note = interaction.fields.getTextInputValue('note') || 'なし';

  if (isNaN(amount)) {
    return interaction.editReply({ content: '⚠️ 金額は半角数字で入力してください。' });
  }

  // ここでスレッドを作成し、経費報告を投稿します。
  // similar to the sales report handler.

  const embed = new EmbedBuilder()
    .setTitle(`🧾 ${storeName} の経費申請`)
    .setColor(0x0078ff)
    .addFields(
      { name: '経費項目', value: item, inline: true },
      { name: '金額', value: `${amount.toLocaleString()}円`, inline: true },
      { name: '申請者', value: `<@${interaction.user.id}>`, inline: true },
      { name: '申請日時', value: dayjs().format('YYYY/MM/DD HH:mm'), inline: false },
      { name: '備考', value: note, inline: false }
    );
  
  // 現時点では、ログに出力して返信するだけです。
  // 実際の装では、スレッドを見つけるか作成し、そこにメッセージを送信します。
  console.log(`New expense report for ${storeName}: ${item} - ${amount}円`);

  // GCSへの保存のプレースホルダー
  // await saveKeihiData(...)

  await sendSettingLog(guildId, {
      title: '経費申請',
      fields: [{ name: '店舗', value: storeName }, { name: '項目', value: item }, { name: '金額', value: `${amount.toLocaleString()}円` }]
  });

  await interaction.editReply({ content: '✅ 経費申請を受け付けました。' });
}

module.exports = { openKeihiReportModal, handleReportSubmit };