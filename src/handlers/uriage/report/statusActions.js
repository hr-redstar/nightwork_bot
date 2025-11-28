// src/handlers/uriage/report/statusActions.js
// ----------------------------------------------------
// 売上報告のステータス変更（承認 / 修正 / 削除）
// ＋ 修正用モーダル
// ----------------------------------------------------

const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { URIAGE_REPORT_IDS } = require('./ids');

// 数値文字列 → number (カンマ除去 + 前後の空白除去)
function parseNumber(str) {
  if (!str) return NaN;
  const cleaned = String(str).replace(/,/g, '').trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

/**
 * 売上報告ステータス変更（承認 / 修正 / 削除 ボタン用）
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} options
 * @param {'approve'|'edit'|'delete'} options.action
 * @param {string} options.recordId
 */
async function handleUriageStatusAction(interaction, { action, recordId }) {
  if (!recordId) {
    return interaction.reply({
      content: 'この売上報告を特定できませんでした。',
      ephemeral: true,
    });
  }

  // -------------------------
  // ✅ 承認
  // -------------------------
  if (action === 'approve') {
    const [origEmbed] = interaction.message.embeds;
    if (!origEmbed) {
      return interaction.reply({
        content: 'このメッセージには更新できる埋め込みがありません。',
        ephemeral: true,
      });
    }

    const embed = EmbedBuilder.from(origEmbed);
    const fields = embed.data.fields || [];
    const idx = fields.findIndex((f) => f.name === 'ステータス');

    if (idx >= 0) {
      fields[idx].value = '✅ 承認済み';
    } else {
      fields.push({ name: 'ステータス', value: '✅ 承認済み', inline: true });
    }

    embed.setFields(fields);

    // ボタンはそのまま（必要ならここで disable にしてもOK）
    await interaction.update({ embeds: [embed] });

    // TODO: GCS 側で recordId を元に status = 'approved' に更新
    return;
  }

  // -------------------------
  // ✏ 修正ボタン → モーダル表示
  // -------------------------
  if (action === 'edit') {
    const messageId = interaction.message.id;

    const modalCustomId = `${URIAGE_REPORT_IDS.EDIT_MODAL_PREFIX}:${recordId}:${messageId}`;

    const modal = new ModalBuilder()
      .setCustomId(modalCustomId)
      .setTitle('売上報告の修正');

    const totalInput = new TextInputBuilder()
      .setCustomId('edit-total')
      .setLabel('総売り（修正後・数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const cashInput = new TextInputBuilder()
      .setCustomId('edit-cash')
      .setLabel('現金（修正後・数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const cardInput = new TextInputBuilder()
      .setCustomId('edit-card')
      .setLabel('カード（修正後・数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const expenseInput = new TextInputBuilder()
      .setCustomId('edit-expense')
      .setLabel('諸経費（修正後・数字のみ）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(totalInput),
      new ActionRowBuilder().addComponents(cashInput),
      new ActionRowBuilder().addComponents(cardInput),
      new ActionRowBuilder().addComponents(expenseInput),
    );

    return interaction.showModal(modal);
  }

  // -------------------------
  // 🗑 削除：メッセージだけ削除（GCSレコードは残す）
  // -------------------------
  if (action === 'delete') {
    await interaction.reply({
      content: 'この売上報告メッセージを削除しました。（データはGCSに残ります）',
      ephemeral: true,
    });

    try {
      await interaction.message.delete();
    } catch (e) {
      // メッセージ削除失敗は無視
    }
    return;
  }
}

/**
 * 売上報告 修正モーダル送信時の処理
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {Object} options
 * @param {string} options.recordId
 * @param {string} options.messageId
 */
async function handleUriageEditModalSubmit(interaction, { recordId, messageId }) {
  // モーダルから値取得
  const totalStr = interaction.fields.getTextInputValue('edit-total')?.trim();
  const cashStr = interaction.fields.getTextInputValue('edit-cash')?.trim();
  const cardStr = interaction.fields.getTextInputValue('edit-card')?.trim();
  const expenseStr = interaction.fields.getTextInputValue('edit-expense')?.trim();

  const total = parseNumber(totalStr);
  const cash = parseNumber(cashStr);
  const card = parseNumber(cardStr);
  const expense = parseNumber(expenseStr);

  if (!Number.isFinite(total) || total < 0) {
    return interaction.reply({
      content: '「総売り」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(cash) || cash < 0) {
    return interaction.reply({
      content: '「現金」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(card) || card < 0) {
    return interaction.reply({
      content: '「カード」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }
  if (!Number.isFinite(expense) || expense < 0) {
    return interaction.reply({
      content: '「諸経費」は0以上の数字で入力してください。',
      ephemeral: true,
    });
  }

  // 残金 = 総売り - (カード + 諸経費)
  const remain = total - (card + expense);

  // 対象メッセージ取得（プライベートスレッド内のメッセージ想定）
  const channel = interaction.channel;
  if (!channel) {
    return interaction.reply({
      content: '修正対象のチャンネルが見つかりませんでした。',
      ephemeral: true,
    });
  }

  let targetMessage;
  try {
    targetMessage = await channel.messages.fetch(messageId);
  } catch (e) {
    return interaction.reply({
      content: '修正対象のメッセージが見つかりませんでした。',
      ephemeral: true,
    });
  }

  const [origEmbed] = targetMessage.embeds;
  if (!origEmbed) {
    return interaction.reply({
      content: 'このメッセージには修正できる埋め込みがありません。',
      ephemeral: true,
    });
  }

  const embed = EmbedBuilder.from(origEmbed);

  const now = new Date();
  const fixedDate = now.toLocaleDateString('ja-JP');
  const member = interaction.user;

  // 元のフィールドは残しつつ、修正後情報を追加
  embed.addFields(
    { name: '修正日', value: fixedDate, inline: true },
    { name: '修正者', value: `<@${member.id}>`, inline: true },
    { name: '総売り(修正後)', value: `${total.toLocaleString()} 円`, inline: true },
    { name: '現金(修正後)', value: `${cash.toLocaleString()} 円`, inline: true },
    { name: 'カード(修正後)', value: `${card.toLocaleString()} 円`, inline: true },
    { name: '諸経費(修正後)', value: `${expense.toLocaleString()} 円`, inline: true },
    { name: '残金(再計算)', value: `${remain.toLocaleString()} 円`, inline: true },
  );

  await targetMessage.edit({ embeds: [embed] });

  // TODO: recordId を使って GCS のレコードも更新したければここで実装

  return interaction.reply({
    content: '✅ 売上報告を修正しました。',
    ephemeral: true,
  });
}

module.exports = {
  handleUriageStatusAction,
  handleUriageEditModalSubmit,
};