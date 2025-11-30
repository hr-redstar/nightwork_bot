// src/handlers/chat_gptBotHandler.js
const { IDS } = require('./chat_gpt/ids');
const {
  handleTodaySettingButton,
  handleTodayStoreSelect,
} = require('./chat_gpt/todaySettingFlow');
const { handleTodaySettingEditButton } = require('./chat_gpt/todayEditFlow');
const {
  handleAnswerChannelButton,
  handleAnswerStoreSelect,
  handleAnswerChannelSelect,
  handleAnswerChannelModal,
} = require('./chat_gpt/answerChannelFlow');
const { handleUsageButton } = require('./chat_gpt/usageFlow');
const {
  handleConversationStartButton,
  handleConversationPromptModal,
  handlePromptSettingButton,
  handlePromptEditModal,
} = require('./chat_gpt/conversationPanel');

// handleTodayRunButton は未定義のため、一時的にダミー関数を定義します。
// TODO: 正しいファイルを require するように修正してください。
const handleTodayRunButton = async (interaction) =>
  interaction.reply({ content: 'この機能は現在開発中です。', ephemeral: true });

async function handleInteraction(interaction) {
  const { customId: id } = interaction;

  // BUTTON
  if (interaction.isButton()) {
    if (id === IDS.BTN_TODAY_SETTING) {
      await handleTodaySettingButton(interaction);
      return true;
    }
    if (id === IDS.BTN_TODAY_EDIT) return await handleTodaySettingEditButton(interaction);
    if (id === IDS.BTN_ANSWER_CHANNEL) return await handleAnswerChannelButton(interaction);
    if (id === IDS.BTN_USAGE) return await handleUsageButton(interaction);
    if (id.startsWith(IDS.BTN_TODAY_RUN_PREFIX)) return await handleTodayRunButton(interaction);

    if (id === IDS.BTN_CONVO_START) {
      await handleConversationStartButton(interaction);
      return true;
    }

    if (id === IDS.BTN_CONVO_PROMPT_SETTING) {
      await handlePromptSettingButton(interaction);
      return true;
    }
  }

  // SELECT_MENU
  if (interaction.isAnySelectMenu()) {
    if (id === IDS.SEL_TODAY_STORE) {
      await handleTodayStoreSelect(interaction);
      return true;
    }

    // isStringSelectMenu と isChannelSelectMenu の両方で呼ばれる可能性がある
    if (id === IDS.SEL_ANSWER_STORE) {
      return await handleAnswerStoreSelect(interaction);
    }

    if (id.startsWith(IDS.SEL_ANSWER_CHANNEL_PREFIX)) return await handleAnswerChannelSelect(interaction);
  }

  // MODAL
  if (interaction.isModalSubmit()) {
    if (id.startsWith(IDS.MODAL_ANSWER_CHANNEL_PREFIX)) return await handleAnswerChannelModal(interaction);

    if (id === IDS.MODAL_CONVO_PROMPT) {
      await handleConversationPromptModal(interaction);
      return true;
    }

    if (id === IDS.MODAL_CONVO_PROMPT_EDIT) {
      await handlePromptEditModal(interaction);
      return true;
    }
  }

  return false;
}

module.exports = { handleInteraction };