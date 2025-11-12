/**
 * src/events/interactionCreate.js
 * すべての Discord インタラクションをハンドリング
 */
const { Events, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

// 機能別ハンドラー
const keihiBotHandlers = require('../handlers/keihiBotHandlers');
const { updateStorePanel } = require('../handlers/tennai_hikkake/tennaiPanel');
const configBotHandlers = require('../handlers/configBotHandlers'); // ✅ 正しくは複数形の "s" が付きます
const configModalHandler = require('../handlers/config/configModalHandler');
const uriageBotHandler = require('../handlers/uriageBotHandler');
const KPIBotHandler = require('../handlers/KPIBotHandler'); // This seems to be a single function handler
const { handleKuzibikiInteraction } = require('../handlers/kuzibiki/kuzibikiPanelHandler');
const { handleInteractionError } = require('../handlers/errorHandlers');


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
        await command.execute(interaction);
        return;
      }

      const buttonHandlers = {
        config_: configBotHandlers.handleInteraction,
        uriage_: uriageBotHandler.handleInteraction, // 念のため確認・統一
        keihi_: keihiBotHandlers.handleInteraction,
        kpi_: KPIBotHandler,
        kuzibiki_: handleKuzibikiInteraction,
      };


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

        // customId のプレフィックスに基づいて適切なハンドラを呼び出す
        for (const prefix in buttonHandlers) {
          if (customId.startsWith(prefix)) {
            await buttonHandlers[prefix](interaction);
            return;
          }
        }

        // --- 店内状況パネル更新 ---
        const updateTriggerIds = [
          'mark_hikkake_success',
          'mark_hikkake_failed',
          'edit_customer_entry',
          'refresh_hikkake_panel',
        ];

        if (updateTriggerIds.includes(customId)) {
          const embedTitle = interaction.message.embeds[0]?.title;
          const storeName = embedTitle?.replace('🏬 店舗: ', '');
          if (!storeName) {
            await handleInteractionError(interaction, '⚠️ 店舗名が特定できませんでした。');
            return;
          }

          const attendance = [];
          const hikakakeLogs = [];
          const storePanelConfig = {
            [storeName]: {
              channelId: interaction.channelId,
              messageId: interaction.message.id,
            },
          };

          await interaction.deferUpdate();
          await updateStorePanel(interaction.client, storeName, attendance, hikakakeLogs, storePanelConfig);
          return;
        }

        return; // ボタン処理終了
      }

      // ============================================================
      // セレクトメニュー
      // ============================================================
      if (interaction.isAnySelectMenu()) {
        const { customId } = interaction;

        // --- 設定ボットのセレクトメニュー ---
        // config_ で始まるもの、または configBotHandlers が処理する select_ で始まるものを優先的に処理
        const handledByConfig = await configBotHandlers.handleInteraction(interaction);
        if (handledByConfig) return; // configBotHandlers が処理したらここで終了

        // configBotHandlers で処理されなかった場合、他のハンドラーを試す
        // KPIBotHandler は kpi_ で始まるもの、または kpi_select_ で始まるものを処理する
        // configBotHandlers が select_ を処理するため、ここでは kpi_ のみ
        if (customId.startsWith('kpi_')) { // 'select_' で始まるカスタムIDはconfigBotHandlersで処理されるため、ここから除外
          await KPIBotHandler(interaction);
          return;
        }

        if (customId.startsWith('keihi_')) {
          await keihiBotHandlers.handleInteraction(interaction);
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

        // --- 各機能モーダル ---
       if (customId.startsWith('kpi_')) return await KPIBotHandler(interaction);
        if (customId.startsWith('modal_kuzibiki_')) return await handleKuzibikiInteraction(interaction);
        if (customId.startsWith('keihi_')) return await keihiBotHandlers.handleInteraction(interaction);
        if (customId.startsWith('uriage_')) return await uriageBotHandler.handleInteraction(interaction);

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
