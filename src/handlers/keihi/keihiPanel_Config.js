// src/handlers/keihi/keihiPanel_Config.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');

async function sendConfigPanel(channel, guildId) {
  try {
    const config = await loadKeihiConfig(guildId);
    const storeRoleConfig = await loadStoreRoleConfig(guildId);

    const approvalRole = config?.roles?.approval || '未設定';
    const viewRole = config?.roles?.view || '未設定';
    const requestRole = config?.roles?.request || '未設定';
    const stores = storeRoleConfig.stores || [];
    const storeList = stores.length > 0
      ? stores.map(name => `・${name}: ${config.stores?.[name] ? `<#${config.stores[name]}>` : '未設定'}`).join('\n')
      : '店舗は未登録です。';

    const embed = new EmbedBuilder()
      .setColor('#2b6cb0')
      .setTitle('📋 経費設定パネル')
      .addFields(
        { name: '🏪 店舗ごとの設置先', value: storeList },
        { name: '承認役職', value: approvalRole, inline: true },
        { name: '閲覧役職', value: viewRole, inline: true },
        { name: '申請役職', value: requestRole, inline: true }
      )
      .setFooter({ text: '設定変更は下のボタンから行えます。' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('keihi_set_panel').setLabel('経費パネル設置').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('keihi_set_approval').setLabel('承認役職').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('keihi_set_view').setLabel('閲覧役職').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('keihi_set_request').setLabel('申請役職').setStyle(ButtonStyle.Secondary),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('keihi_export_csv').setLabel('📄 経費CSV出力').setStyle(ButtonStyle.Success)
    );

    // 既存のパネルを探して更新、なければ新規送信
    const messages = await channel.messages.fetch({ limit: 10 });
    const existingPanel = messages.find(
      m => m.author.bot && m.embeds[0]?.title === '📋 経費設定パネル'
    );

    if (existingPanel) {
      await existingPanel.edit({ embeds: [embed], components: [row1, row2] });
    } else {
      await channel.send({ embeds: [embed], components: [row1, row2] });
    }
  } catch (err) {
    console.error('経費設定パネル送信エラー:', err);
  }
}

module.exports = { sendConfigPanel };
