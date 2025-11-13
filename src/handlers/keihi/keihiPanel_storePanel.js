// src/handlers/keihi/keihiPanel_storePanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { loadKeihiConfig, saveKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const { IDS } = require('./ids'); // IDSをインポート

async function postStoreKeihiPanel(channel, storeName, guildId) {
  const config = await loadKeihiConfig(guildId);
  config.stores = config.stores || {};
  config.stores[storeName] = channel.id;
  await saveKeihiConfig(guildId, config);

  const embed = new EmbedBuilder()
    .setColor('#2b6cb0')
    .setTitle(`📋 経費申請パネル（${storeName}）`)
    .setDescription('経費申請する場合は、下のボタンを押してください。')
    .addFields({ name: '経費項目', value: 'まだ設定されていません。' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${IDS.BTN_ITEM_REGISTER}:${storeName}`)
      .setLabel('経費項目登録')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${IDS.BTN_REPORT_OPEN}:${storeName}`)
      .setLabel('経費申請')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

module.exports = { postStoreKeihiPanel };
