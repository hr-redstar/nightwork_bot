/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// --- 各機能のハンドラー ---
const { handleInteraction: handleKeihiInteraction } = require('../handlers/keihiBotHandlers');
const configBotHandlers = require('../handlers/configBotHandlers');
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

        try {
          // --- 売上 ---
          if (customId.startsWith('uriage:')) {
            return await handleUriageInteraction(interaction);
          }

          // --- 出退勤 ---
          if (customId.startsWith('syut_') || customId.startsWith('cast_')) {
            return await handleSyutInteractions(interaction);
          }

          // --- 経費（新仕様 keihi_* に統一）---
          if (customId.startsWith('keihi_')) {
            return await handleKeihiInteraction(interaction);
          }

          // --- 設定 ---
          if (customId.startsWith('config_')) {
            return await configBotHandlers.handleInteraction(interaction);
          }

          // --- fallback ---
          logger.warn(`[interactionCreate] 未対応ボタン: ${customId}`);
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply({
              content: '⚠️ 未対応のボタンです。',
              ephemeral: true,
            });
          }
        } catch (subErr) {
          logger.error(`[interactionCreate:Button] ${customId} エラー:`, subErr);
          return await handleInteractionError(interaction, '⚠️ ボタン処理中にエラーが発生しました。');
        }
        return;
      }

      // ============================================================
      // 🌟 3) セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        try {
          if (customId.startsWith('uriage:'))
            return await handleUriageInteraction(interaction);

          if (customId.startsWith('syut_') || customId.startsWith('role_select:') || customId.startsWith('user_select:'))
            return await handleSyutInteractions(interaction);

          // --- 経費統一ルール keihi_ ---
          if (customId.startsWith('keihi_'))
            return await handleKeihiInteraction(interaction);

          const handledByConfig = await configBotHandlers.handleInteraction(interaction);
          if (handledByConfig) return;

          logger.warn(`[interactionCreate] 未対応セレクト: ${customId}`);
        } catch (subErr) {
          logger.error(`[interactionCreate:SelectMenu] ${customId} エラー:`, subErr);
          return await handleInteractionError(interaction, '⚠️ リスト選択処理中にエラーが発生しました。');
        }
        return;
      }

      // ============================================================
      // 🌟 4) モーダル
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        try {
          if (customId.startsWith('uriage:'))
            return await handleUriageInteraction(interaction);

          if (customId.startsWith('syut_') || customId.startsWith('user_entry_modal:'))
            return await handleSyutInteractions(interaction);

          // --- 経費モーダル（新仕様 keihi_）---
          if (customId.startsWith('keihi_'))
            return await handleKeihiInteraction(interaction);

          // --- 設定モーダル ---
          if (customId.startsWith('config_') || customId.startsWith('modal_'))
            return await configBotHandlers.handleInteraction(interaction);

          logger.warn(`[interactionCreate] 未対応モーダル: ${customId}`);
        } catch (subErr) {
          logger.error(`[interactionCreate:Modal] ${customId} エラー:`, subErr);
          return await handleInteractionError(interaction, '⚠️ モーダル送信処理中にエラーが発生しました。');
        }
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
