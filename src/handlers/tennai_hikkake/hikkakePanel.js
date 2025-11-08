// src/handlers/tennai_hikkake/hikkakePanel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const dayjs = require('dayjs');

function createHikkakePanel(allStoresData) {
  const embed = new EmbedBuilder()
    .setTitle('🏠 店内状況（ひっかけ用）')
    .setColor('#2b2d31')
    .setTimestamp()
    .setDescription(`📅 ${dayjs().format('YYYY/MM/DD')}`);

  // allStoresData: [{ name, channelLink, currentCustomers, freePl, freeKama, castList }]
  allStoresData.forEach(store => {
    embed.addFields({
      name: `${store.name} ${store.channelLink}`,
      value:
        `✨ 接客中\n人数：${store.currentCustomers}名\nキャスト：${store.castList.join(' ')}\n` +
        `💤 空きキャスト数\nプラ：${store.freePl}名　カマ：${store.freeKama}名`,
      inline: false,
    });
  });

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('refresh_hikkake_panel')
      .setLabel('🔄 更新')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [buttonRow] };
}

module.exports = { createHikkakePanel };