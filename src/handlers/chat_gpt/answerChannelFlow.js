// src/handlers/chat_gpt/answerChannelFlow.js

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const logger = require('../../utils/logger');
const { IDS } = require('./ids');
const { buildStoreSelectOptions: buildStoreOptions } = require('../../utils/config/storeSelectHelper');
const {
  loadAnswerChannels,
  saveAnswerChannels,
} = require('../../utils/chat_gpt/gcsChatGptManager');
const { sendSettingLog } = require('../../utils/config/configLogger');
const { postConversationPanel } = require('./conversationPanel');
const { postChatGptSettingPanel } = require('./panel');

// ----------------------------------------------------
// ① ボタン押下: 店舗_役職_ロール.json から店舗一覧を読み、店舗が無ければ MANUAL フロー
// ----------------------------------------------------
async function handleAnswerChannelButton(interaction) {
  const guildId = interaction.guild.id;

  const storeOptions = await buildStoreOptions(guildId);

  if (storeOptions.length > 0) {
    const storeSelect = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_ANSWER_STORE)
      .setPlaceholder('chat gpt回答チャンネルを設定する店舗を選択してください')
      .addOptions(storeOptions);

    const row = new ActionRowBuilder().addComponents(storeSelect);

    await interaction.reply({
      content: '店舗を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // --- 店舗_役職_ロール.json に店舗が1件も無い場合だけ、MANUALモード ---
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(IDS.SEL_ANSWER_CHANNEL_PREFIX + 'MANUAL')
    .setPlaceholder('chat gptの回答チャンネルを選択してください')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.reply({
    content:
      '店舗_役職_ロール.json に店舗が登録されていないため、\n' +
      '先にチャンネルを選択し、その後のモーダルで店舗名とAPIキーを入力してください。',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ----------------------------------------------------
// ②-1 店舗選択後: チャンネル選択メニューを表示
// ----------------------------------------------------
async function handleAnswerStoreSelect(interaction) {
  const storeId = interaction.values[0];

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(IDS.SEL_ANSWER_CHANNEL_PREFIX + storeId)
    .setPlaceholder('chat gptの回答チャンネルを選択してください')
    .addChannelTypes(ChannelType.GuildText);

  const row = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.update({
    content: '次に、この店舗用の回答チャンネルを選択してください。',
    components: [row],
  });
}

// ----------------------------------------------------
// ②-2 チャンネル選択後: APIキー入力モーダルを表示
// ----------------------------------------------------
async function handleAnswerChannelSelect(interaction) {
  const channel = interaction.channels.first();
  if (!channel) {
    return interaction.reply({
      content: 'チャンネルが選択されていません。',
      flags: MessageFlags.Ephemeral,
    });
  }

  // customId: "chatgpt_sel_answer_ch_<storeId>"
  const storeId = interaction.customId.substring(IDS.SEL_ANSWER_CHANNEL_PREFIX.length);

  // customId: "chatgpt_modal_answer_ch_<storeId>_<channelId>"
  const modalCustomId = `${IDS.MODAL_ANSWER_CHANNEL_PREFIX}${storeId}_${channel.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle('ChatGPT 回答チャンネル設定');

  const apiKeyInput = new TextInputBuilder()
    .setCustomId('apiKey')
    .setLabel('ChatGPT APIキー')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('sk- から始まるAPIキーを入力してください。')
    .setRequired(true);

  // MANUALモードの場合だけ店舗名入力フィールドを追加
  if (storeId === 'MANUAL') {
    const storeNameInput = new TextInputBuilder()
      .setCustomId('storeName')
      .setLabel('店舗名')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例：本店')
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(storeNameInput));
  }

  modal.addComponents(new ActionRowBuilder().addComponents(apiKeyInput));

  await interaction.showModal(modal);
}

// ----------------------------------------------------
// ③ モーダル送信後: 設定保存 & パネル設置
// ----------------------------------------------------
async function handleAnswerChannelModal(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;

  // customId: "chatgpt_modal_answer_ch_<storeId>_<channelId>"
  const parts = interaction.customId.substring(IDS.MODAL_ANSWER_CHANNEL_PREFIX.length).split('_');
  const storeId = parts[0];
  const channelId = parts[1];

  const apiKey = interaction.fields.getTextInputValue('apiKey');
  let storeName;

  if (storeId === 'MANUAL') {
    storeName = interaction.fields.getTextInputValue('storeName');
  } else {
    storeName = storeId; // valueが店舗名なので、そのまま使用
  }

  const answerChannels = await loadAnswerChannels(guildId);

  const newEntry = {
    storeId,
    storeName,
    channelId,
    apiKey,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id,
  };

  // 同じチャンネルIDがあれば上書き、なければ追加
  const existingIndex = answerChannels.findIndex((c) => c.channelId === channelId);
  if (existingIndex >= 0) {
    answerChannels[existingIndex] = newEntry;
  } else {
    answerChannels.push(newEntry);
  }

  await saveAnswerChannels(guildId, answerChannels);

  // 対象チャンネルに会話パネルを設置
  const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (targetChannel) {
    try {
      await postConversationPanel(targetChannel);
    } catch (err) {
      logger.error('[answerChannelFlow] 会話パネルの設置に失敗しました:', err);
    }
  }

  // 設定ログを送信
  try {
    await sendSettingLog(interaction, {
      title: 'ChatGPT 回答チャンネル設定',
      description: `店舗「${storeName}」の回答チャンネルを <#${channelId}> に設定しました。`,
      fields: [
        { name: '設定者', value: `<@${user.id}>`, inline: true },
        { name: '設定日時', value: new Date().toLocaleString('ja-JP'), inline: true },
      ],
      color: 0x2ecc71,
    });
  } catch (err) {
    logger.error('[answerChannelFlow] 設定ログの送信に失敗しました:', err);
  }

  const channelForPanelUpdate = interaction.channel;

  await interaction.reply({
    content:
      `店舗「${storeName}」のChatGPT回答チャンネルを <#${channelId}> に設定しました。\n` +
      '対象チャンネルに会話開始用のパネルを設置しました。',
    flags: MessageFlags.Ephemeral,
  });

  // 設定パネルを更新
  try {
    // 元のインタラクションがあったチャンネルにパネルを再投稿
    await postChatGptSettingPanel(channelForPanelUpdate);
  } catch (err) {
    logger.error('[answerChannelFlow] 設定パネルの更新に失敗しました:', err);
  }
}

module.exports = {
  handleAnswerChannelButton,
  handleAnswerStoreSelect,
  handleAnswerChannelSelect,
  handleAnswerChannelModal,
};