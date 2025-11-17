/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// 機能別ハンドラー
const { handleInteraction: handleKeihiInteraction } = require('../handlers/keihiBotHandlers');
const configBotHandlers = require('../handlers/configBotHandlers');
const configModalHandler = require('../handlers/config/configModalHandler');
const { handleSyutInteractions } = require('../handlers/syutBotHandler');
const { handleUriageInteraction } = require('../handlers/uriageBotHandler');
const handleKpiInteraction = require('../handlers/KPIBotHandler');
const { handleKuzibikiInteraction } = require('../handlers/kuzibiki/kuzibikiPanelHandler');
const { handleInteractionError } = require('../utils/errorHandlers');
const { handleCommand } = require('../handlers/commandHandler');

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
      // ✅ スラッシュコマンド
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

        const { sendCommandLog } = require('../handlers/config/configLogger');
        await sendCommandLog(interaction);

        await handleCommand(interaction, command);
        return;
      }

      // ============================================================
      // ✅ ボタン
      // ============================================================
      if (interaction.isButton()) {
        const { customId } = interaction;

        try {
          if (customId.startsWith('uriage:')) {
            await handleUriageInteraction(interaction);
            return;
          }

          // 出退勤関連
          if (customId.startsWith('syut_') || customId.startsWith('cast_')) {
            await handleSyutInteractions(interaction);
            return;
          }

          // ✅ 経費関連ボタンを全部 keihiBotHandler に集約
          if (
            customId.startsWith('keihi:') || // 新命名規則用 keihi:config / keihi:panel / keihi:request / keihi:approve
            customId.startsWith('keihi_') || // 旧: keihi_approve など
            customId.startsWith('keihiRequest_') || // 万が一のパターン
            customId.startsWith('keihi_request_') // 今問題になってる keihi_request_〜
          ) {
            await handleKeihiInteraction(interaction);
            return;
          }

          // 設定系
          if (customId.startsWith('config_')) {
            await configBotHandlers.handleInteraction(interaction);
            return;
          }

          // fallback: 未対応
          logger.warn(`[interactionCreate] 未対応ボタン: ${customId}`);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '⚠️ 未対応のボタンです。', ephemeral: true });
          }
        } catch (subErr) {
          logger.error(`[interactionCreate:Button] ${customId} エラー:`, subErr);
          await handleInteractionError(interaction, '⚠️ ボタン処理中にエラーが発生しました。');
        }
        return;
      }

      // ============================================================
      // ✅ セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        try {
          if (customId.startsWith('uriage:')) return await handleUriageInteraction(interaction);
          if (customId.startsWith('syut_') || customId.startsWith('role_select:') || customId.startsWith('user_select:'))
            return await handleSyutInteractions(interaction);

          // 経費関連のセレクトメニューを keihiBotHandlers に渡す
          if (customId.startsWith('keihi_') || customId.startsWith('keihi:'))
            return await handleKeihiInteraction(interaction);

          const handledByConfig = await configBotHandlers.handleInteraction(interaction);
          if (handledByConfig) return;

          logger.warn(`[interactionCreate] 未対応セレクト: ${customId}`);
        } catch (subErr) {
          logger.error(`[interactionCreate:SelectMenu] ${customId} エラー:`, subErr);
          await handleInteractionError(interaction, '⚠️ リスト選択処理中にエラーが発生しました。');
        }
        return;
      }

      // ============================================================
      // ✅ モーダル送信
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        try {
          if (customId.startsWith('uriage:')) return await handleUriageInteraction(interaction);
          if (customId.startsWith('syut_') || customId.startsWith('user_entry_modal:'))
            return await handleSyutInteractions(interaction);
          if (customId.startsWith('keihi:')) return await handleKeihiInteraction(interaction);

          // 設定関連のモーダルを configBotHandlers に渡す
          if (customId.startsWith('config_') || customId.startsWith('modal_')) {
            return await configBotHandlers.handleInteraction(interaction);
          }

          logger.warn(`[interactionCreate] 未対応モーダル: ${customId}`);
        } catch (subErr) {
          logger.error(`[interactionCreate:Modal] ${customId} エラー:`, subErr);
          await handleInteractionError(interaction, '⚠️ モーダル送信処理中にエラーが発生しました。');
        }
        return;
      }

      // ============================================================
      // 未対応のInteraction
      // ============================================================
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚠️ 未対応の操作です。', ephemeral: true });
      }
    } catch (err) {
      logger.error('[interactionCreate] ルートエラー:', err);
      await handleInteractionError(interaction, '⚠️ 予期せぬエラーが発生しました。');
    }
  },
};
