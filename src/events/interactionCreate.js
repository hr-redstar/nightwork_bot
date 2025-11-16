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

        // カスタムボタン登録
        if (interaction.client.buttons.has(customId)) {
          await interaction.client.buttons.get(customId).execute(interaction);
          return;
        }

        // 新しい売上ハンドラを呼び出す
        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 新しい経費ハンドラを呼び出す
        if (customId.startsWith('keihi:')) {
          await handleKeihiInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('cast_') || customId.startsWith('kuro_')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // customId のプレフィックスに基づいて適切なハンドラを呼び出す
        if (customId.startsWith('config_')) {
          await configBotHandlers.handleInteraction(interaction);
          return;
        }

        // KPI関連のハンドラを呼び出す
        if (customId.startsWith('kpi_')) {
          await handleKpiInteraction(interaction);
          return;
        }

        // // --- 店内状況パネル更新 ---
        // if (customId.startsWith('hikkake_') || customId.startsWith('setup_hikkake_')) {
        //   await handleTennaiHikkakeInteraction(interaction);
        //   return;
        // }

        return; // ボタン処理終了
      }

      // ============================================================
      // セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        // 新しい売上ハンドラを呼び出す
        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 新しい経費ハンドラを呼び出す
        if (customId.startsWith('keihi:')) {
          await handleKeihiInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('role_select:') || customId.startsWith('user_select:') || customId.startsWith('cast_today_')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // // 店内状況・ひっかけ
        // if (customId.startsWith('select_store_for_hikkake') || customId.startsWith('select_channel_for_hikkake_')) {
        //   await handleTennaiHikkakeInteraction(interaction);
        // }

        // --- 設定ボットのセレクトメニュー ---
        // config_ で始まるもの、または configBotHandlers が処理する select_ で始まるものを優先的に処理
        const handledByConfig = await configBotHandlers.handleInteraction(interaction);
        if (handledByConfig) return; // configBotHandlers が処理したらここで終了

        // configBotHandlers で処理されなかった場合、他のハンドラーを試す
        // KPIBotHandler は kpi_ で始まるもの、または kpi_select_ で始まるものを処理する
        // configBotHandlers が select_ を処理するため、ここでは kpi_ のみ
        if (customId.startsWith('kpi_')) { // 'select_' で始まるカスタムIDはconfigBotHandlersで処理されるため、ここから除外
          await handleKpiInteraction(interaction);
          return;
        }

        if (customId.startsWith('kuzibiki_') || customId === 'select_kuzibiki_count') {
          await handleKuzibikiInteraction(interaction);
          return;
        }

        return;
      }

      // ============================================================
      // モーダル送信
      // ============================================================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        // --- 設定モーダル ---
        // modal_user_info_ は configSelect_userInfo.js で直接処理するため、ここでは除外
        if (customId.startsWith('modal_user_info_')) {
          await configBotHandlers.handleInteraction(interaction); // configBotHandlers経由でhandleUserInfoSubmitを呼び出す
          return;
        }
        if (customId.startsWith('modal_')) { // その他の modal_ は configModalHandler で処理
          await configModalHandler.handleInteraction(interaction);
          return;
        }

        // 新しい売上ハンドラを呼び出す
        if (customId.startsWith('uriage:')) {
          await handleUriageInteraction(interaction);
          return;
        }

        // 新しい経費ハンドラを呼び出す
        if (customId.startsWith('keihi:')) {
          await handleKeihiInteraction(interaction);
          return;
        }

        // 出退勤関連のハンドラを呼び出す
        if (customId.startsWith('syut_') || customId.startsWith('user_entry_modal:') || customId.startsWith('cast_today_time_modal:')) {
          await handleSyutInteractions(interaction);
          return;
        }

        // // 店内状況・ひっかけ
        // if (customId.startsWith('hikkake_report_modal_')) {
        //   await handleTennaiHikkakeInteraction(interaction);
        // }

        // --- 各機能モーダル ---
       if (customId.startsWith('kpi_')) return await handleKpiInteraction(interaction);
        if (customId.startsWith('modal_kuzibiki_')) return await handleKuzibikiInteraction(interaction);
        
        if (customId === 'select_store_modal') {
          const storeName = interaction.fields.getTextInputValue('store_name');
          await interaction.reply({
            content: `✅ 店舗「${storeName}」を選択しました。店内状況・客数一覧を送信できます。`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // どのハンドラーにも該当しない場合
        await interaction.reply({
          content: `⚠️ 未定義のモーダル: ${customId}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } catch (err) {
      logger.error('[interactionCreate] エラー:', err);
      await handleInteractionError(interaction, '⚠️ 不明なエラーが発生しました。');
    }
  },
};
