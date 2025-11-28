// src/handlers/uriage/report/reportPanel.js
// ----------------------------------------------------
// 店舗別 売上報告パネルの Embed / コンポーネント生成
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { URIAGE_REPORT_IDS } = require('./ids');

/**
 * 売上報告パネル用メッセージ生成
 * @param {string} storeKey
 * @param {string} [storeName]
 * @returns {{ embeds: import('discord.js').EmbedBuilder[], components: import('discord.js').ActionRowBuilder[] }}
 */
function buildUriageReportPanel(storeKey, storeName) {
  const name = storeName || storeKey;

  const embed = new EmbedBuilder()
    .setTitle(`💰 売上報告パネル - ${name}`)
    .setDescription('このパネルから本日の売上報告を行ってください。');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${URIAGE_REPORT_IDS.OPEN_REQUEST_MODAL_PREFIX}:${storeKey}`)
      .setLabel('売上報告')
      .setStyle(ButtonStyle.Primary),
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

module.exports = {
  buildUriageReportPanel,
};
