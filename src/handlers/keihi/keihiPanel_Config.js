// src/handlers/keihi/keihiPanel_Config.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadKeihiConfig, saveKeihiConfig } = require('../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const logger = require('../../utils/logger');

async function sendConfigPanel(channel, guildId) {
  try {
    const [config, storeRoleConfig] = await Promise.all([loadKeihiConfig(guildId), loadStoreRoleConfig(guildId)]);

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

    let panelMessage;
    // 1. 設定ファイルからIDを特定
    if (config.panel?.messageId) {
      panelMessage = await channel.messages.fetch(config.panel.messageId).catch(() => null);
    }

    // 2. IDで見つからなければタイトルで検索（後方互換性のため）
    if (!panelMessage) {
      const messages = await channel.messages.fetch({ limit: 10 });
      panelMessage = messages.find(m => m.author.bot && m.embeds[0]?.title === '📋 経費設定パネル');
    }

    if (panelMessage) {
      await panelMessage.edit({ embeds: [embed], components: [row1, row2] });
    } else {
      panelMessage = await channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // 送信/更新したパネルのIDを設定に保存
    config.panel = config.panel || {};
    config.panel.messageId = panelMessage.id;
    config.panel.channelId = channel.id;
    await saveKeihiConfig(guildId, config);
  } catch (err) {
    logger.error('❌ 経費設定パネル送信エラー:', err);
  }
}

module.exports = { sendConfigPanel };
