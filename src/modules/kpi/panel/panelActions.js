// modules/kpi/panel/panelActions.js
// ----------------------------------------------------
// KPI パネル上のアクション処理
//  - KPI申請役職
//  - KPI目標登録
//  - KPI申請
// ----------------------------------------------------

const {
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');

// ====================================================
// KPI申請役職
// ====================================================
async function handleKpiRequestRole(interaction) {
  try {
    const row = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('kpi:select:role:request')
        .setPlaceholder('KPI申請役職を選択してください')
    );

    await interaction.reply({
      content: '📊 KPI申請が可能な役職を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('[KPI] handleKpiRequestRole error:', err);
  }
}

// ====================================================
// KPI目標登録
// ====================================================
async function handleKpiTargetRegister(interaction) {
  try {
    const modal = new ModalBuilder()
      .setCustomId('kpi:modal:target')
      .setTitle('KPI目標登録');

    modal.addComponents(
      createInputRow('visitors', '来客数', '数値を入力', true),
      createInputRow('nominationCount', '指名本数', '数値を入力', true),
      createInputRow('nominationSales', '指名売上', '数値を入力（円）', true),
      createInputRow('freeSales', 'フリー売上', '数値を入力（円）', true),
      createInputRow('totalSales', '総売上', '数値を入力（円）', true)
    );

    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[KPI] handleKpiTargetRegister error:', err);
  }
}

// ====================================================
// KPI申請
// ====================================================
async function handleKpiApply(interaction) {
  try {
    const modal = new ModalBuilder()
      .setCustomId('kpi:modal:apply')
      .setTitle('KPI申請');

    modal.addComponents(
      createInputRow('visitors', '来客数', '実績値を入力', true),
      createInputRow('nominationCount', '指名本数', '実績値を入力', true),
      createInputRow('nominationSales', '指名売上', '実績値を入力（円）', true),
      createInputRow('freeSales', 'フリー売上', '実績値を入力（円）', true),
      createInputRow('totalSales', '総売上', '実績値を入力（円）', true)
    );

    await interaction.showModal(modal);
  } catch (err) {
    logger.error('[KPI] handleKpiApply error:', err);
  }
}

// ====================================================
// 共通：モーダル入力行
// ====================================================
function createInputRow(customId, label, placeholder, required = false) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setStyle(TextInputStyle.Short)
    .setRequired(required);

  return new ActionRowBuilder().addComponents(input);
}

module.exports = {
  handleKpiRequestRole,
  handleKpiTargetRegister,
  handleKpiApply,
};