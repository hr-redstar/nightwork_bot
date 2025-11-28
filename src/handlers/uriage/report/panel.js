// src/handlers/uriage/report/panel.js
// 売上報告パネルのEmbed構築とメッセージ更新

const logger = require('../../../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { loadUriageConfig, saveUriageConfig } = require('../../../utils/uriage/uriageConfigManager');
const { loadUriageStoreConfig } = require('../../../utils/uriage/gcsUriageManager');
const { IDS } = require('./ids');

function buildUriageReportPanelEmbed(storeKey, storeName) {
  const name = storeName || storeKey;
  return new EmbedBuilder()
    .setTitle(`💰 売上報告パネル - ${name}`)
    .setDescription('このパネルから本日の売上報告を行ってください。');
}

function buildUriageReportPanelComponents(storeKey) {
  const reportButton = new ButtonBuilder()
    .setCustomId(`${IDS.BTN_REPORT_OPEN}:${storeKey}`)
    .setLabel('売上を報告する')
    .setStyle(ButtonStyle.Primary);
  return [new ActionRowBuilder().addComponents(reportButton)];
}

async function upsertStoreReportPanelMessage(guild, storeId, globalConfig) {
  const storeConfig = await loadUriageStoreConfig(guildId, storeId);
  const storeName = storeConfig.name || storeId;

  const panelInfo = globalConfig.panels?.[storeId];
  if (!panelInfo?.channelId) return null;

  try {
    const channel = await guild.channels.fetch(panelInfo.channelId);
    if (!channel?.isTextBased()) return null;

    const embed = buildUriageReportPanelEmbed(storeId, storeName);
    const components = buildUriageReportPanelComponents(storeId);

    if (panelInfo.messageId) {
      try {
        const message = await channel.messages.fetch(panelInfo.messageId);
        await message.edit({ embeds: [embed], components });
        logger.info(`🔄 売上報告パネルを更新しました（${storeId}）`);
        return message;
      } catch (err) {
        if (err.code === 10008) { // Unknown Message
          logger.warn(`[uriage/report/panel] 既存パネルメッセージが見つかりません (ID: ${panelInfo.messageId})。再送信します。`);
        } else {
          throw err;
        }
      }
    }

    const sent = await channel.send({ embeds: [embed], components });
    logger.info(`🆕 売上報告パネルを新規設置しました（${storeId}）`);

    // config の messageId を更新
    globalConfig.panels[storeId].messageId = sent.id;
    await saveUriageConfig(guild.id, globalConfig);

    return sent;
  } catch (err) {
    logger.error(`[uriage/report/panel] 店舗ID ${storeId} のパネル設置/更新失敗`, err);
    return null;
  }
}

module.exports = {
  buildUriageReportPanelEmbed,
  buildUriageReportPanelComponents,
  upsertStoreReportPanelMessage,
};