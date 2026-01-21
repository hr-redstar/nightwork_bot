// src/handlers/uriage/report/updateReportPanel.js
const { readJSON } = require('../../../utils/gcs');
const logger = require('../../../utils/logger');
const { buildUriageReportPanelEmbed } = require('./reportPanelEmbed');

/**
 * 既設置の「売上報告パネル」を編集更新する
 * ※ uriage/config.json に storeごとの panelChannelId / panelMessageId が保存されている前提
 */
async function updateUriageReportPanel(client, guildId, storeName) {
  // 店舗config（ロール情報）
  const storeCfg = (await readJSON(`GCS/${guildId}/uriage/${storeName}/config.json`)) || {};

  // グローバルconfig（パネル設置先・メッセージID）
  const uriageCfg = (await readJSON(`GCS/${guildId}/uriage/config.json`)) || {};

  // ★実データのキーに合わせて取得（候補を吸収）
  const panelInfo =
    uriageCfg?.panels?.[storeName] ||
    uriageCfg?.panelLocations?.[storeName] ||
    uriageCfg?.panelMap?.[storeName] ||
    null;

  // グローバルに見つからない場合、店舗個別設定を確認
  if (!panelInfo) {
    if (storeCfg.panelChannelId && storeCfg.panelMessageId) {
      panelInfo = {
        channelId: storeCfg.panelChannelId,
        messageId: storeCfg.panelMessageId,
      };
    } else if (storeCfg.panel) {
      panelInfo = storeCfg.panel;
    }
  }

  const panelChannelId =
    panelInfo?.channelId ?? panelInfo?.panelChannelId ?? panelInfo?.channel ?? panelInfo?.panelChannel;
  const panelMessageId =
    panelInfo?.messageId ?? panelInfo?.panelMessageId ?? panelInfo?.message ?? panelInfo?.panelMessage;

  if (!panelChannelId || !panelMessageId) {
    logger.warn('[uriage/report] panel id not found in config', { storeName, panelInfo });
    return { ok: false, reason: 'panel_id_not_found' };
  }

  const channel = await client.channels.fetch(panelChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return { ok: false, reason: 'channel_not_found' };

  const msg = await channel.messages.fetch(panelMessageId).catch(() => null);
  if (!msg) return { ok: false, reason: 'message_not_found' };

  const embed = buildUriageReportPanelEmbed(storeName, storeCfg);

  // components（ボタン列）は既存のまま維持し、Embedのみ更新
  await msg.edit({ embeds: [embed] });

  return { ok: true };
}

module.exports = { updateUriageReportPanel };