/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// --- 各機能のハンドラー ---
const { handleInteractionError } = require('../utils/errorHandlers');
const { handleCommand } = require('../handlers/commandHandler');
const { handleUriageInteraction } = require('../modules/uriage');

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
      // 🌟 2) ボタン / セレクトメニュー / モーダル (Registry Dispatch)
      // ============================================================
      const { customId } = interaction;
      if (customId) {
        // 特別なPrefix (Registryに入れるのが難しい場合や既存ロジック優先)
        if (customId.startsWith('approval:')) {
          // TODO: Common Approval Module is not fully implemented yet.
          // Requires context binding (e.g. redis/db) to map messageId to logic.
          return;
        }

        const registry = require('../handlers/interactionRegistry');

        // Registryから前方一致でハンドラー検索
        // キーが長い順にソートしておくと 'config' と 'config_sub' のような被りを防げるが、
        // 現状は 'syut' と 'syut:' くらいなので、先に一致したもので良いか、
        // あるいはループ順序を制御するか。
        // ここでは単純ループ。
        for (const [prefix, handler] of Object.entries(registry)) {
          // 区切り文字を考慮：prefixが "syut" なら "syut:" や "syut_" または "syut"そのものにマッチ
          if (customId === prefix || customId.startsWith(prefix + ':') || customId.startsWith(prefix + '_')) {
            await handler(interaction);
            return;
          }
          // 既存の実装に合わせて単純startsWithも許容する場合 (例: select_channel_for_hikkake_123 -> prefix: select_channel_for_hikkake)
          if (prefix.length > 5 && customId.startsWith(prefix)) {
            await handler(interaction);
            return;
          }
        }
      }

      // ============================================================
      // fallback: 未対応
      // ============================================================
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        logger.warn(`[interactionCreate] 未処理のインタラクション: ${customId}`);
        return await interaction.reply({
          content: '⚠️ 未対応の操作です。',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error('[interactionCreate] ルートエラー:', err);
      // エラーハンドラーが既にあるのでそれを使う手もあるが、ここでは直接呼び出し
      return await handleInteractionError(interaction, '⚠️ 予期せぬエラーが発生しました。');
    }
  },
};
