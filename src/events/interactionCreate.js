/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const path = require('path');

// --- App Router Initialization ---
const appRouter = require('../structures/AppRouter');

// Initialize Router (Load modules)
// 一度だけ実行されるようにトップレベルで行う
const modulesDir = path.join(__dirname, '../modules'); // events/../modules -> src/modules
appRouter.loadModules(modulesDir);

// --- 各機能のハンドラー ---
const { handleInteractionError } = require('../utils/errorHandlers');
const { handleCommand } = require('../handlers/commandHandler');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    try {
      logger.info(`[INTERACTION] PID:${process.pid} isBtn:${interaction.isButton()} isSel:${interaction.isAnySelectMenu()} isModal:${interaction.isModalSubmit()} customId:${interaction.customId || ''}`);

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
      // 🌟 2) ボタン / セレクトメニュー / モーダル (AppRouter Dispatch)
      // ============================================================
      if (interaction.customId) {
        // 特別なPrefix
        if (interaction.customId.startsWith('approval:')) {
          // TODO: Common Approval Module is not fully implemented yet.
          return;
        }

        // AppRouter で処理
        const handled = await appRouter.dispatch(interaction);
        if (handled) return;
      }

      // ============================================================
      // fallback: 未対応
      // ============================================================
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        logger.warn(`[interactionCreate] 未処理のインタラクション: ${interaction.customId}`);
        return await interaction.reply({
          content: '⚠️ 未対応の操作です。',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error('[interactionCreate] ルートエラー:', err);
      return await handleInteractionError(interaction, '⚠️ 予期せぬエラーが発生しました。');
    }
  },
};
