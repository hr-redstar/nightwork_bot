// src/handlers/uriage/report/reportPanel.js
// ----------------------------------------------------
// 「売上報告パネル 店舗名」を送信
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

/**
 * 売上報告パネルを送信
 * @param {import('discord.js').TextChannel} channel
 * @param {string} storeName
 */
async function postUriageReportPanel(channel, storeName) {
  const embed = new EmbedBuilder()
    .setTitle(`売上報告パネル (${storeName})`)
    .setDescription('閲覧役職 / 申請役職 を設定してから、売上報告ボタンを使用してください。')
    .addFields(
      { name: '閲覧役職', value: '未設定', inline: true },
      { name: '申請役職', value: '未設定', inline: true },
    )
    .setColor('#3498db');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`URIAGE_VIEW_ROLE__${storeName}`)
      .setLabel('閲覧役職')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`URIAGE_REQUEST_ROLE__${storeName}`)
      .setLabel('申請役職')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`URIAGE_SALES_REPORT__${storeName}`)
      .setLabel('売上報告')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({
    embeds: [embed],
    components: [row1, row2],
  });
}

module.exports = {
  postUriageReportPanel,
};
