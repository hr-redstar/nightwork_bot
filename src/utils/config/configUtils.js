// src/utils/config/configUtils.js
const buildConfigPanel = require('../../handlers/config/configPanel');
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
        const message = await channel.messages.fetch(config.panel.messageId).catch(() => null);
        if (message) {
          const panelData = await buildConfigPanel(interaction.guildId);
          await message.edit(panelData).catch(err => logger.warn('[configUtils] パネル更新失敗', err));
        }
      }
    }

    // ログ出力
    logger.info(logMessage);
  } catch (err) {
    logger.error('[configUtils] パネル更新/ログ出力エラー', err);
  }
}

module.exports = { updateConfigPanelAndLog };