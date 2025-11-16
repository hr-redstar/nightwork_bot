/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// 機能別ハンドラー
const { handleInteraction: handleKeihiInteraction } = require('../handlers/keihiBotHandlers');
// const handleTennaiHikkakeInteraction = require('../handlers/tennai_hikkakeBotHandler'); // 未完成のため一時的に無効化
const configBotHandlers = require('../handlers/configBotHandlers'); // ✅ 正しくは複数形の "s" が付きます
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

      // --- ログ出力共通 ---
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
      // スラッシュコマンド
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
        // コマンドログを出力
        const { sendCommandLog } = require('../handlers/config/configLogger');
        await sendCommandLog(interaction);

        await handleCommand(interaction, command);
        return;
      }



      // ============================================================
      // ボタン押下
      // ============================================================
      if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('cast_')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // customId のプレフィックスに基づいて適切なハンドラを呼び出す
        // configBotHandlers は config_ で始まるIDを処理
        if (customId.startsWith('config_') || customId.startsWith('keihi:')) {
          await configBotHandlers.handleInteraction(interaction);
          return;
        }

        // デフォルトで他のハンドラを試す
        if (interaction.client.buttons.has(customId)) {
          await interaction.client.buttons.get(customId).execute(interaction);
        }
      }

      // ============================================================
      // セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;
        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('role_select:') || customId.startsWith('user_select:')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // --- 設定ボットのセレクトメニュー ---
        const handledByConfig = await configBotHandlers.handleInteraction(interaction);
        if (handledByConfig) return; // configBotHandlers が処理したらここで終了
      }

      // ============================================================
      // モーダル送信
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('user_entry_modal:')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // --- 設定モーダル ---
        const handledByConfig = await configBotHandlers.handleInteraction(interaction);
        if (handledByConfig) return;
      }
    } catch (err) {
      logger.error('[interactionCreate] エラー:', err);
      await handleInteractionError(interaction, '⚠️ 不明なエラーが発生しました。');
    }
  },
};
