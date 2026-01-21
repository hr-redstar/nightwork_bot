// src/handlers/syut/syutAttendanceModal.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

async function showRegModal(interaction, kind, storeName, manual = false) {
  const modal = new ModalBuilder()
    .setCustomId(`syut_modal_${manual ? 'manual' : 'select'}_${kind}_${storeName}`)
    .setTitle(`${manual ? '✍️ 手入力' : '🟢 出退勤'} 登録｜${storeName}`);

  if (manual) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('names').setLabel('名前（改行で複数）').setStyle(TextInputStyle.Paragraph).setRequired(true)
      )
    );
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('dates').setLabel('日付（YYYY-MM-DD 改行で複数可）').setStyle(TextInputStyle.Paragraph).setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('in').setLabel('出勤時間（例 18:00）').setStyle(TextInputStyle.Short).setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('out').setLabel('退勤時間（例 21:00）').setStyle(TextInputStyle.Short).setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

module.exports = { showRegModal };
