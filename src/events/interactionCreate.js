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
      // 🌟 2) ボタン
      // ============================================================
      // ============================================================
      // 🌟 2) ボタン
      // ============================================================
      if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId.startsWith('approval:')) {
          // This part needs a way to get the context for the specific feature (kpi, uriage, etc.)
          // For now, we'll assume a placeholder.
          return;
        }

        if (customId.startsWith('setting:')) {
          const { routeSettingInteraction } = require('../handlers/setting/common/settingRouter');
          await routeSettingInteraction(interaction);
          return;
        }

        if (customId.startsWith('uriage_') || customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // --- 経費（新仕様 keihi_* に統一）---
        if (customId.startsWith('keihi_')) {
          const { handleKeihiInteraction } = require('../modules/keihi');
          await handleKeihiInteraction(interaction);
          return;
        }

        // --- KPI ---
        if (customId.startsWith('kpi:')) {
          const { handleKpiInteraction } = require('../modules/kpi');
          await handleKpiInteraction(interaction);
          return;
        }

        // --- 出退勤 (syut, cast, kuro) ---
        if (customId.startsWith('syut:') || customId.startsWith('syut_') || customId.startsWith('cast_') || customId.startsWith('kuro_')) {
          const { handleSyutInteraction } = require('../modules/syut');
          await handleSyutInteraction(interaction);
          return;
        }

        // --- 店内状況・ひっかけ ---
        if (customId.startsWith('tennai_hikkake:') || customId.startsWith('hikkake_report_') || customId.startsWith('setup_hikkake_')) {
          const { handleTennaiHikkakeInteraction } = require('../modules/tennai_hikkake');
          await handleTennaiHikkakeInteraction(interaction);
          return;
        }

        // --- くじ引き ---
        if (customId.startsWith('kuzibiki:')) {
          const { handleKuzibikiInteraction } = require('../modules/kuzibiki');
          await handleKuzibikiInteraction(interaction);
          return;
        }

        // --- ChatGPT ---
        if (customId.startsWith('chatgpt_') || customId.startsWith('chat_gpt:')) {
          const { handleChatGptInteraction } = require('../modules/chat_gpt');
          await handleChatGptInteraction(interaction);
          return;
        }

        // --- 設定機能 ---
        if (customId.startsWith('config_') || customId.startsWith('config:')) {
          const { handleConfigInteraction } = require('../modules/config');
          await handleConfigInteraction(interaction);
          return;
        }

        return;
      }

      // ============================================================
      // 🌟 3) セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        if (customId.startsWith('approval:')) {
          // Placeholder for context-aware routing
          return;
        }

        if (customId.startsWith('setting:')) {
          const { routeSettingInteraction } = require('../handlers/setting/common/settingRouter');
          await routeSettingInteraction(interaction);
          return;
        }

        if (customId.startsWith('uriage_') || customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // --- 経費統一ルール keihi_ ---
        if (customId.startsWith('keihi_')) {
          const { handleKeihiInteraction } = require('../modules/keihi');
          await handleKeihiInteraction(interaction);
          return;
        }

        // --- KPI ---
        if (customId.startsWith('kpi:')) {
          const { handleKpiInteraction } = require('../modules/kpi');
          await handleKpiInteraction(interaction);
          return;
        }

        // --- 出退勤 ---
        if (customId.startsWith('syut:') || customId.startsWith('syut_') || customId.startsWith('role_select:') || customId.startsWith('cast_') || customId.startsWith('kuro_')) {
          const { handleSyutInteraction } = require('../modules/syut');
          await handleSyutInteraction(interaction);
          return;
        }

        // --- 店内状況・ひっかけ ---
        if (customId.startsWith('tennai_hikkake:') || customId.startsWith('select_store_for_hikkake') || customId.startsWith('select_channel_for_hikkake_')) {
          const { handleTennaiHikkakeInteraction } = require('../modules/tennai_hikkake');
          await handleTennaiHikkakeInteraction(interaction);
          return;
        }

        // --- くじ引き ---
        if (customId.startsWith('kuzibiki:')) {
          const { handleKuzibikiInteraction } = require('../modules/kuzibiki');
          await handleKuzibikiInteraction(interaction);
          return;
        }


        // --- ChatGPT ---
        if (customId.startsWith('chatgpt_') || customId.startsWith('chat_gpt:')) {
          const { handleChatGptInteraction } = require('../modules/chat_gpt');
          await handleChatGptInteraction(interaction);
          return;
        }

        // --- 設定機能 ---
        if (customId.startsWith('config_') || customId.startsWith('config:')) {
          const { handleConfigInteraction } = require('../modules/config');
          await handleConfigInteraction(interaction);
          return;
        }

        return;
      }

      // ============================================================
      // 🌟 4) モーダル
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        if (customId.startsWith('approval:')) {
          // Placeholder for context-aware routing
          return;
        }

        if (customId.startsWith('setting:')) {
          const { routeSettingInteraction } = require('../handlers/setting/common/settingRouter');
          await routeSettingInteraction(interaction);
          return;
        }

        if (customId.startsWith('uriage_') || customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // --- 経費モーダル（新仕様 keihi_）---
        if (customId.startsWith('keihi_')) {
          const { handleKeihiInteraction } = require('../modules/keihi');
          await handleKeihiInteraction(interaction);
          return;
        }

        // --- KPI ---
        if (customId.startsWith('kpi:')) {
          const { handleKpiInteraction } = require('../modules/kpi');
          await handleKpiInteraction(interaction);
          return;
        }

        // --- 出退勤 ---
        if (customId.startsWith('syut:') || customId.startsWith('syut_') || customId.startsWith('cast_') || customId.startsWith('kuro_')) {
          const { handleSyutInteraction } = require('../modules/syut');
          await handleSyutInteraction(interaction);
          return;
        }

        // --- 店内状況・ひっかけ ---
        if (customId.startsWith('tennai_hikkake:') || customId.startsWith('hikkake_report_modal_')) {
          const { handleTennaiHikkakeInteraction } = require('../modules/tennai_hikkake');
          await handleTennaiHikkakeInteraction(interaction);
          return;
        }

        // --- くじ引き ---
        if (customId.startsWith('kuzibiki:')) {
          const { handleKuzibikiInteraction } = require('../modules/kuzibiki');
          await handleKuzibikiInteraction(interaction);
          return;
        }


        // --- ChatGPT ---
        if (customId.startsWith('chatgpt_') || customId.startsWith('chat_gpt:')) {
          const { handleChatGptInteraction } = require('../modules/chat_gpt');
          await handleChatGptInteraction(interaction);
          return;
        }

        // --- 設定機能 ---
        if (customId.startsWith('config_') || customId.startsWith('config:')) {
          const { handleConfigInteraction } = require('../modules/config');
          await handleConfigInteraction(interaction);
          return;
        }

        return;
      }

      // ============================================================
      // fallback: 未対応
      // ============================================================
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({
          content: '⚠️ 未対応の操作です。',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } catch (err) {
      logger.error('[interactionCreate] ルートエラー:', err);
      return await handleInteractionError(interaction, '⚠️ 予期せぬエラーが発生しました。');
    }
  },
};
