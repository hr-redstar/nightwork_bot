/**
 * src/handlers/config/configModalHandler.js
 * 設定関連のモーダル処理（既存パネルをupdateで上書き更新）
 */

const { MessageFlags, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger'); // loggerのインポートを修正
const { handleStoreEditSubmit } = require('./configModal_store');
const { handleRoleEditSubmit } = require('./configModal_role');
const { updatePanel } = require('../../utils/panelUpdater');

/**
 * モーダル全体のハンドラー
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleInteraction(interaction) {
  try {
    const { customId, guildId, user } = interaction;

    // ==========================
    // 店舗名編集モーダル
    // ==========================
    if (customId.startsWith('modal_store_edit')) {
      const result = await handleStoreEditSubmit(interaction);

      // パネル再描画
      if (result?.embed || result?.components) {
        await updatePanel(interaction, result.embed ? [result.embed] : [], result.components || []);
        return;
      }
      return;
    }

    // ==========================
    // 役職編集モーダル
    // ==========================
    if (customId.startsWith('modal_role_edit')) {
      const result = await handleRoleEditSubmit(interaction);

      if (result?.embed || result?.components) {
        await updatePanel(interaction, result.embed ? [result.embed] : [], result.components || []);
        return;
      }
      return;
    }

    // ==========================
    // 未定義モーダル
    // ==========================
    await interaction.reply({
      content: `⚠️ 未定義のモーダルです：${customId}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error('❌ [configModalHandler] モーダル処理エラー:', err);

    // 安全にエラー通知
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ モーダル送信処理中にエラーが発生しました。',
        flags: MessageFlags.Ephemeral,
      });
    } else {
      try {
        await interaction.followUp({
          content: '⚠️ モーダル送信処理中にエラーが発生しました。',
          flags: MessageFlags.Ephemeral,
        });
      } catch (_) {}
    }
  }
}

module.exports = { handleInteraction };
