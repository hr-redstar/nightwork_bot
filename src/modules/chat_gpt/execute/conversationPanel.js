// src/handlers/chat_gpt/conversationPanel.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { IDS } = require('./ids');
const logger = require('../../../utils/logger');
const {
  initThreadLog,
  loadThreadLog,
  saveThreadLog,
} = require('../../../utils/chat_gpt/chatGptThreadLogManager');
const { loadAnswerChannels } = require('../../../utils/chat_gpt/gcsChatGptManager');

// デフォルトプロンプト定義（100文字以内 & 未入力用）
const DEFAULT_PROMPT =
  'あなたは落ち着いた黒服です。丁寧で穏やかな口調で話し、必要に応じて優しい助言を行ってください。';

/**
 * 会話パネルを投稿する
 * @param {import('discord.js').TextChannel} channel
 */
async function postConversationPanel(channel) {
  // チャンネルの最後のメッセージを取得して、すでにパネルがあるか確認
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const panelMessage = messages.find(
      (m) =>
        m.author.bot &&
        m.embeds[0]?.title === '🤖 ChatGPT 会話パネル' &&
        m.components[0]?.components[0]?.customId === IDS.BTN_CONVO_START
    );
    if (panelMessage) {
      logger.info(`[conversationPanel] チャンネル ${channel.name} には既に会話パネルが存在します。`);
      return; // 既にパネルがあれば何もしない
    }
  } catch (err) {
    logger.warn('[conversationPanel] メッセージの取得に失敗:', err);
  }
  const embed = new EmbedBuilder()
    .setTitle('🤖 ChatGPT 会話パネル')
    .setDescription(
      '下のボタンを押して、ChatGPTとのプライベートな会話スレッドを開始します。\n' +
      'スレッド内での会話は記憶され、文脈を理解した返答が可能です。'
    )
    .setColor('#5865F2');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONVO_START)
      .setLabel('会話を開始する')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

/**
 * 「会話開始」ボタンのハンドラ
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleConversationStartButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(IDS.MODAL_CONVO_PROMPT)
    .setTitle('chat gpt 会話開始プロンプト');

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('ChatGPTのキャラクター設定（未入力可）')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      '未入力可：落ち着いた黒服として丁寧に話すキャラになります（100字以内）'
    )
    .setRequired(false); // 未入力OK

  modal.addComponents(new ActionRowBuilder().addComponents(promptInput));

  await interaction.showModal(modal);
}

/**
 * 会話開始モーダルのハンドラ
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleConversationPromptModal(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({
      content: 'ギルド内でのみ使用できます。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = guild.id;
  const user = interaction.user;
  const parentChannel = interaction.channel;

  if (!parentChannel || parentChannel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'chat gpt会話パネルのあるテキストチャンネルで実行してください。',
      flags: MessageFlags.Ephemeral,
    });
  }

  // 未入力ならデフォルトプロンプト
  const promptRaw = interaction.fields.getTextInputValue('prompt') || '';
  const prompt = promptRaw.trim() === '' ? DEFAULT_PROMPT : promptRaw.trim();

  const threadName = `${user.username}-chat-gpt`;
  const threadReason = 'chat gpt会話用スレッド作成';

  const thread = await parentChannel.threads.create({
    name: threadName,
    autoArchiveDuration: 60,
    type: ChannelType.PrivateThread,
    reason: threadReason,
  });

  if (thread.setTopic) {
    await thread
      .setTopic(
        '@メンションユーザー でそのユーザーもこのスレッドに強制参加させれます。'
      )
      .catch(() => { });
  }

  try {
    await thread.members.add(user.id);
  } catch (err) {
    logger.warn('[conversationPanel] スレッドメンバー追加失敗:', err);
  }

  // APIキーを answerChannels から取得（一番新しい設定を流用）
  const answerChannels = await loadAnswerChannels(guildId);
  const latestSetting = answerChannels.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )[0];
  const apiKey = latestSetting?.apiKey;

  // スレッドの初期ログを作成
  const initialLog = { basePrompt: prompt, apiKey, messages: [] };
  await saveThreadLog(guildId, thread.id, initialLog);

  // ユーザーへ案内
  await interaction.reply({
    content:
      'discordサーバーで chat gptスレッドを作成しました。\n' +
      `スレッドリンク：${thread.toString()}\n\n` +
      'あなたのプロンプト（コピー用）：\n' +
      '```text\n' +
      prompt +
      '\n```\n' +
      'サーバーに保存していますが、誤ってスレッドを削除した場合、\n' +
      'プロンプトや会話内容が消える場合があります。\n' +
      '十分ご注意ください。\n\n' +
      '※ pw などの重要な個人情報は送らないで下さい。',
    flags: MessageFlags.Ephemeral,
  });

  // スレッドの最初の案内メッセージ + 「プロンプト設定」ボタン
  const introText = [
    `ようこそ <@${user.id}> さんの chat gpt スレッドです！`,
    'ここでの会話内容はこのスレッド専用で記憶されます。',
    '他のユーザーを参加させたい場合は、そのユーザーを @メンション してください。',
  ].join('\n');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_CONVO_PROMPT_SETTING)
      .setLabel('プロンプト設定')
      .setStyle(ButtonStyle.Secondary)
  );

  await thread.send({
    content: introText,
    components: [row],
  });
}

/**
 * 「プロンプト設定」ボタンのハンドラ
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handlePromptSettingButton(interaction) {
  const channel = interaction.channel;
  if (!channel || !channel.isThread?.()) {
    return interaction.reply({
      content: 'このボタンは chat gptスレッド内でのみ使用できます。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(IDS.MODAL_CONVO_PROMPT_EDIT)
    .setTitle('chat gpt プロンプト再設定');

  const promptInput = new TextInputBuilder()
    .setCustomId('prompt')
    .setLabel('新しいプロンプト（未入力ならデフォルト）')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(
      '未入力可：落ち着いた黒服として丁寧に話すキャラになります（100字以内）'
    )
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(promptInput));

  await interaction.showModal(modal);
}

/**
 * プロンプト再設定モーダルのハンドラ
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handlePromptEditModal(interaction) {
  const guild = interaction.guild;
  const channel = interaction.channel;

  if (!guild || !channel || !channel.isThread?.()) {
    return interaction.reply({
      content: 'このモーダルは chat gptスレッド内でのみ使用できます。',
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = guild.id;
  const threadId = channel.id;
  const user = interaction.user;

  const promptRaw = interaction.fields.getTextInputValue('prompt') || '';
  const newPrompt = promptRaw.trim() === '' ? DEFAULT_PROMPT : promptRaw.trim();

  const log = (await loadThreadLog(guildId, threadId)) || {};
  log.basePrompt = newPrompt;

  await saveThreadLog(guildId, threadId, log);

  await interaction.reply({
    content:
      'このスレッドの ChatGPT プロンプトを更新しました。\n' +
      '```text\n' +
      newPrompt +
      '\n```',
    flags: MessageFlags.Ephemeral,
  });

  await channel.send(
    `🔧 <@${user.id}> さんがこのスレッドのプロンプトを更新しました。`
  );
}

module.exports = {
  postConversationPanel,
  handleConversationStartButton,
  handleConversationPromptModal,
  handlePromptSettingButton,
  handlePromptEditModal,
};