// src/utils/config/configUtils.js
const { sendConfigPanel } = require('../../handlers/config/configPanel');
const logger = require('../logger');

/**
 * 設定パネルを更新し、ログを出力する共通関数
 * @param {import('discord.js').Interaction} interaction
 * @param {object} config
 * @param {string} logMessage
 */
async function updateConfigPanelAndLog(interaction, config, logMessage) {
  try {
    // 設定パネルを更新
    if (config.panel?.channelId && config.panel?.messageId) {
      const channel = await interaction.guild.channels.fetch(config.panel.channelId).catch(() => null);
      if (channel?.isTextBased()) {
        // 既存のパネルを自動検索して更新する高機能版を使用
        await sendConfigPanel(channel);
      }
    }

    // ログ出力
    logger.info(logMessage);
  } catch (err) {
    logger.error('[configUtils] パネル更新/ログ出力エラー', err);
  }
}

module.exports = { updateConfigPanelAndLog };