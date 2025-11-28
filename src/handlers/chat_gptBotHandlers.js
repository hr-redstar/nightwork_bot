// src/handlers/chat_gptBotHandlers.js
// ----------------------------------------------------
// ChatGPT 設定パネル用の dispatcher
//   - ChatGPT設定パネルのボタン / セレクト / モーダル を振り分け
//   - configBotHandlers と同じスタイル
// ----------------------------------------------------

const logger = require('../utils/logger');

// IDS 定義
const { IDS } = require('./chat_gpt/ids');

// 今日のchat gpt 設定フロー
const {
  handleTodaySettingButton,
  handleTodayStoreChannelSelect,
  handleTodaySettingModal,
} = require('./chat_gpt/todaySettingFlow');

const { handleTodaySettingEditButton } = require('./chat_gpt/todayEditFlow');
const { handleAnswerChannelButton } = require('./chat_gpt/answerChannelFlow');
const { handleUsageButton } = require('./chat_gpt/usageFlow');

// =====================================================
// handleInteraction（ChatGPT用 dispatcher）
// =====================================================

/**
 * ChatGPT関連の interaction dispatcher
 * configBotHandlers と同じく、処理したら true、未処理なら false を返す
 *
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>}
 */
async function handleInteraction(interaction) {
  try {
    const id = interaction.customId;

    // customId が無い interaction（スラッシュコマンドなど）はここでは扱わない
    if (!id) return false;

    // --------------------------------
    // BUTTON
    // --------------------------------
    if (interaction.isButton()) {
      // 今日のchat gpt設定
      if (id === IDS.BTN_TODAY_SETTING) {
        await handleTodaySettingButton(interaction);
        return true;
      }

      // 今日のchat gpt設定編集（※まだ実装してなければ後で追加）
      if (id === IDS.BTN_TODAY_EDIT) {
        await handleTodaySettingEditButton(interaction);
        return true;
      }

      // chatgpt回答チャンネル設定（※後で実装）
      if (id === IDS.BTN_ANSWER_CHANNEL) {
        await handleAnswerChannelButton(interaction);
        return true;
      }

      // chat gpt使用率（※後で実装）
      if (id === IDS.BTN_USAGE) {
        await handleUsageButton(interaction);
        return true;
      }

      // 「今日のchat gpt」実行ボタン（チャンネルに設置されるやつ）
      //  customId: chatgpt_today_run_<channelId>
      if (id.startsWith(IDS.BTN_TODAY_RUN_PREFIX)) {
        // ここで実行フローに飛ばす
        // 例: await handleTodayRunButton(interaction);
        // まだ実装していなければ、TODOとして残しておく
        // TODO: 今日のchat gpt 実行ボタン処理
        return false;
      }
    }

    // --------------------------------
    // SELECT MENUS
    // --------------------------------
    if (interaction.isAnySelectMenu()) {
      // 今日のchat gpt設定：店舗 + チャンネル選択
      if (id === IDS.SEL_TODAY_STORE_CHANNEL) {
        await handleTodayStoreChannelSelect(interaction);
        return true;
      }

      // 回答チャンネル設定のセレクト等は、後でここに追加
      // 例:
      // if (id === IDS.SEL_ANSWER_STORE_CHANNEL) { ... }
    }

    // --------------------------------
    // MODALS
    // --------------------------------
    if (interaction.isModalSubmit()) {
      // 今日のchat gpt設定モーダル
      if (id.startsWith(IDS.MODAL_TODAY_SETTING)) {
        await handleTodaySettingModal(interaction);
        return true;
      }

      // 設定編集 / 回答チャンネル設定のモーダルは後で追加
      // if (id.startsWith(IDS.MODAL_TODAY_EDIT)) { ... }
      // if (id.startsWith(IDS.MODAL_ANSWER_CHANNEL)) { ... }
    }

    // どれにも該当しなければ未処理
    return false;
  } catch (err) {
    logger.error('[chat_gptBotHandlers] エラー:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '⚠️ ChatGPT設定パネル処理中にエラーが発生しました。',
        ephemeral: true,
      }).catch(() => {});
    }
    return true; // エラーだが「ここで処理した」とみなす
  }
}

module.exports = handleInteraction;
