const { MessageFlags } = require('discord.js');
const logger = require('../../../utils/logger');

/**
 * KPI申請開始処理
 */
async function handleApplyStart(interaction) {
  logger.info(`[KPI] handleApplyStart called by ${interaction.user.tag}`);
  await interaction.reply({
    content: 'KPI申請機能は現在準備中です。',
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * KPI申請モーダル送信処理
 */
async function handleSubmitKpiApply(interaction) {
  logger.info(`[KPI] handleSubmitKpiApply called by ${interaction.user.tag}`);
  await interaction.reply({
    content: 'KPI申請の送信機能は現在準備中です。',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleApplyStart,
  handleSubmitKpiApply,
};