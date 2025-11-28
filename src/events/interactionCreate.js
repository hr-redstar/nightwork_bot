/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// --- 各機能のハンドラー ---
const { handleInteractionError } = require('../utils/errorHandlers');
const { handleCommand } = require('../handlers/commandHandler');

const { handleUriageInteraction } = require('../handlers/uriageBotHandler.js');
const { handleKeihiInteraction } = require('../handlers/keihi/keihiBotHandlers');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      if (!interaction) {
        logger.warn('[interactionCreate] interaction が未定義です');
        return;
      }

      // --- ログ共通出力 ---
      const type = interaction.isChatInputCommand()
        ? 'コマンド'
        : interaction.isButton()
        ? 'ボタン'
        : interaction.isModalSubmit()
        ? 'モーダル'
        : interaction.isAnySelectMenu()
        ? 'リスト'
        : 'その他';

      const identifier = interaction.commandName || interaction.customId || 'unknown';

      logger.info(
        `[${interaction.guild?.name || 'DM'}] ${type} > ${identifier} by ${interaction.user.tag} (${interaction.user.id})`
      );

      // ============================================================
      // 🌟 1) スラッシュコマンド
      // ============================================================
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: `❌ コマンドが見つかりません: ${interaction.commandName}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // コマンドログ
        const { sendCommandLog } = require('../handlers/config/configLogger');
        await sendCommandLog(interaction);

        await handleCommand(interaction, command);
        return;
      }

      // ============================================================
      // 🌟 2) ボタン
      // ============================================================
      if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId.startsWith('uriage:')) {
          return handleUriageInteraction(interaction);
        }

          // --- 経費（新仕様 keihi_* に統一）---
          if (customId.startsWith('keihi_')) {
            return handleKeihiInteraction(interaction);
          }

        return;
      }

      // ============================================================
      // 🌟 3) セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        if (customId.startsWith('uriage:')) {
          return handleUriageInteraction(interaction);
        }

          // --- 経費統一ルール keihi_ ---
          if (customId.startsWith('keihi_')) return handleKeihiInteraction(interaction);
        return;
      }

      // ============================================================
      // 🌟 4) モーダル
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        if (customId.startsWith('uriage:')) {
          return handleUriageInteraction(interaction);
        }

          // --- 経費モーダル（新仕様 keihi_）---
          if (customId.startsWith('keihi_')) return handleKeihiInteraction(interaction);
        return;
      }

      // ============================================================
      // fallback: 未対応
      // ============================================================
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: '⚠️ 未対応の操作です。',
          ephemeral: true,
        });
      }
    } catch (err) {
      logger.error('[interactionCreate] ルートエラー:', err);
      return await handleInteractionError(interaction, '⚠️ 予期せぬエラーが発生しました。');
    }
  },
};
