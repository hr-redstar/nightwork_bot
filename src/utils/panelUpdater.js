/**
 * src/utils/panelUpdater.js
 * すべての機能で使える、既存パネルメッセージ上書き更新ユーティリティ
 */
const logger = require('./logger');

async function updatePanel(interaction, embeds = [], components = [], content = null) {
  try {
    const payload = {};
    if (embeds?.length) payload.embeds = embeds;
    if (components?.length) payload.components = components;
    if (content) payload.content = content;

    // --- 優先順に安全更新 ---
    if (interaction.isButton?.() || interaction.isAnySelectMenu?.()) {
      await interaction.update(payload);
      logger.debug(`[panelUpdater] interaction.update() 成功: ${interaction.customId}`);
      return true;
    }
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
      logger.debug(`[panelUpdater] interaction.editReply() 成功`);
      return true;
    }
    if (interaction.message) {
      await interaction.message.edit(payload);
      logger.debug(`[panelUpdater] message.edit() 成功`);
      return true;
    }

    logger.warn(`[panelUpdater] 更新可能なメッセージが見つかりません`);
    return false;
  } catch (err) {
    logger.error(`❌ [panelUpdater] 更新失敗: ${err.message}`);
    try {
      if (!interaction.replied) {
        await interaction.reply({ content: '⚠️ パネル更新に失敗しました。', ephemeral: true });
      }
    } catch {}
    return false;
  }
}

module.exports = { updatePanel };
