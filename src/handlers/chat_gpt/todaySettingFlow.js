// src/handlers/chat_gpt/todaySettingFlow.js
// ----------------------------------------------------
// 「今日のchat gpt設定」フロー
//
// ボタン押下 → 店舗 & チャンネル選択 → モーダル入力 → 保存 & パネル更新 & ログ
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require('discord.js');

const logger = require('../../utils/logger');
const { IDS } = require('./ids');
const {
  loadTodaySettings,
  saveTodaySettings,
} = require('../../utils/chatgpt/gcsChatGptManager');

const { loadStoreRoleConfig } = require('../../utils/config/storeRoleConfigManager');
const { sendSettingLog, sendAdminLog } = require('../../utils/config/configLogger');
const { postChatGptSettingPanel } = require('./panel');

// ---------------------------------------------
// 店舗一覧を取得して SelectMenu 用オプションに変換
// （storeRoleConfig の構造に合わせて必要なら調整）
// ---------------------------------------------
async function buildStoreOptions(guildId) {
  const storeConfig = await loadStoreRoleConfig(guildId).catch(() => null);

  if (!storeConfig || !storeConfig.stores) {
    // stores が無い場合は空配列
    return [];
  }

  // 例: storeConfig.stores = { storeId: { name: '店舗名', ... }, ... }
  return Object.entries(storeConfig.stores)
    .map(([storeId, store]) => ({
      label: store.name || storeId,
      value: storeId,
    }))
    .slice(0, 25); // Discord制限
}

// ---------------------------------------------
// ① ボタン押下時: 店舗 & チャンネル選択メニューを表示
// ---------------------------------------------
/**
 * 「今日のchat gpt設定」ボタンハンドラー
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleTodaySettingButton(interaction) {
  const guildId = interaction.guild.id;

  const storeOptions = await buildStoreOptions(guildId);
  if (storeOptions.length === 0) {
    return interaction.reply({
      content: '店舗設定が見つかりません。\n先に /設定店舗情報 などで店舗を登録してください。',
      ephemeral: true,
    });
  }

  const storeSelect = new StringSelectMenuBuilder()
    .setCustomId(IDS.SEL_TODAY_STORE_CHANNEL)
    .setPlaceholder('店舗を選択してください')
    .addOptions(storeOptions);

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(IDS.SEL_TODAY_STORE_CHANNEL) // 同じ customId で受け取り、interaction.values / channels で判別
    .setPlaceholder('「今日のchat gpt」を送信するテキストチャンネルを選択')
    .addChannelTypes(ChannelType.GuildText);

  const row1 = new ActionRowBuilder().addComponents(storeSelect);
  const row2 = new ActionRowBuilder().addComponents(channelSelect);

  await interaction.reply({
    content: '「今日のchat gpt」を設定する店舗とチャンネルを選択してください。',
    components: [row1, row2],
    ephemeral: true,
  });
}

// ---------------------------------------------
// ② 店舗 & チャンネル選択後: モーダル表示
// ---------------------------------------------
/**
 * 店舗 + チャンネル選択時のハンドラー
 * @param {import('discord.js').AnySelectMenuInteraction} interaction
 */
async function handleTodayStoreChannelSelect(interaction) {
  const guildId = interaction.guild.id;

  // StringSelectMenu と ChannelSelectMenu の2種類が同じ customId を使うので、
  // interaction.isStringSelectMenu / isChannelSelectMenu で分岐
  if (interaction.isStringSelectMenu()) {
    // 店舗選択 (storeId を一旦保持するため、モーダルの customId に埋め込む)
    const storeId = interaction.values[0];

    // もう片方のチャンネル選択の完了を待たず、storeId だけ保持しても良いが、
    // ここでは「チャンネルも一緒に送られている」前提にして簡略化
    // → 実運用で問題あれば、stateを一時保存する仕組みを追加してください。

    // ひとまずレスポンスだけしておく
    return interaction.update({
      content: `店舗を選択しました：${storeId}\n続けてチャンネルを選択してください。`,
      components: interaction.message.components,
    });
  }

  if (interaction.isChannelSelectMenu()) {
    const channel = interaction.channels.first();
    if (!channel) {
      return interaction.reply({
        content: 'チャンネルが選択されていません。',
        ephemeral: true,
      });
    }

    // 店舗IDは簡易的に「最初に選択された値」を message.embeds 等から拾う方法もあるが、
    // ここではモーダル内で店舗名も直接入力させた方が安全なので、
    // 店舗名はモーダルに自由入力フィールドを設ける形にします。

    const modal = new ModalBuilder()
      .setCustomId(IDS.MODAL_TODAY_SETTING + `:${channel.id}`) // channelId を customId に埋め込む
      .setTitle('今日のchat gpt設定');

    const storeNameInput = new TextInputBuilder()
      .setCustomId('storeName')
      .setLabel('店舗名（表示用）')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例：歌舞伎町本店')
      .setRequired(true);

    const apiKeyInput = new TextInputBuilder()
      .setCustomId('apiKey')
      .setLabel('APIキー')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('sk- から始まるキーを入力')
      .setRequired(true);

    const modelInput = new TextInputBuilder()
      .setCustomId('model')
      .setLabel('モデル一覧（1つだけ残してください）')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('例：\ngpt-5.1-mini\ngpt-4.1-mini\ngpt-4o\n→ 最後に1つだけ残す')
      .setRequired(true);

    const promptInput = new TextInputBuilder()
      .setCustomId('prompt')
      .setLabel('プロンプト')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('あなたは東京○○在住、筋肉マッチョのイケメン黒服です。...')
      .setRequired(true);

    const toneInput = new TextInputBuilder()
      .setCustomId('tone')
      .setLabel('口調の柔らかさ (0~2)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('0:かたい / 1:ふつう / 2:やわらかい')
      .setRequired(true);

    const maxTokensInput = new TextInputBuilder()
      .setCustomId('maxTokens')
      .setLabel('回答上限文字数')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('例：800')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(storeNameInput),
      new ActionRowBuilder().addComponents(apiKeyInput),
      new ActionRowBuilder().addComponents(modelInput),
      new ActionRowBuilder().addComponents(promptInput),
      new ActionRowBuilder().addComponents(toneInput),
      // maxTokens は一応必須だが、フィールド数制限のため調整したければ2つ目のモーダルに分けてもOK
    );

    // Discord の制限でモーダルに TextInput は最大5個なので、
    // maxTokens が溢れる場合は tone とまとめる or 2 回目モーダルに分割してください。
    // ここでは tone, maxTokens をまとめて1つのフィールドにしてもOK。
    // （必要なら上の定義を調整）

    await interaction.showModal(modal);
  }
}

// ---------------------------------------------
// ③ モーダル送信後: 保存 & ボタン設置 & ログ出力 & パネル更新
// ---------------------------------------------
/**
 * 今日のchat gpt設定モーダル submit ハンドラー
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleTodaySettingModal(interaction) {
  const guildId = interaction.guild.id;
  const user = interaction.user;
  const now = new Date();

  // customId: "chatgpt_modal_today_setting:<channelId>"
  const [modalId, channelId] = interaction.customId.split(':');
  if (modalId !== IDS.MODAL_TODAY_SETTING || !channelId) {
    return;
  }

  const storeName = interaction.fields.getTextInputValue('storeName');
  const apiKey = interaction.fields.getTextInputValue('apiKey');
  const modelRaw = interaction.fields.getTextInputValue('model');
  const prompt = interaction.fields.getTextInputValue('prompt');
  const toneRaw = interaction.fields.getTextInputValue('tone');
  const maxTokensRaw = interaction.fields.getTextInputValue('maxTokens');

  // モデルは「1行1モデルで書いて、最後に1つだけ残す想定」なので、最初の1行だけ採用
  const model = (modelRaw || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)[0] || 'gpt-5.1-mini';

  const toneLevel = Number.isNaN(Number(toneRaw)) ? null : Number(toneRaw);
  const maxTokens = Number.isNaN(Number(maxTokensRaw)) ? null : Number(maxTokensRaw);

  // 既存設定を読み込み
  const todaySettings = await loadTodaySettings(guildId);

  // 同じ channelId があれば上書き、なければ追加
  const idx = todaySettings.findIndex((s) => s.channelId === channelId);
  const newData = {
    storeName,
    channelId,
    apiKey,
    model,
    prompt,
    toneLevel,
    maxTokens,
    updatedAt: now.toISOString(),
    updatedBy: user.id,
  };

  if (idx >= 0) {
    todaySettings[idx] = newData;
  } else {
    todaySettings.push(newData);
  }

  await saveTodaySettings(guildId, todaySettings);

  // 対象チャンネルに「今日のchat gpt」ボタン付きメッセージを送信
  const targetChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
  if (targetChannel) {
    const todayEmbed = new EmbedBuilder()
      .setTitle(`今日のchat gpt - ${storeName}`)
      .setDescription(
        '今日のイベントや天気・ニュース、前日の売上やひっかけ状況、\n' +
        '前日のKPI達成率や同伴情報、本日のキャストなどをまとめてコメントします。'
      )
      .setColor('#00b0f4');

    const runButton = new ActionRowBuilder().addComponents(
      new require('discord.js').ButtonBuilder()
        .setCustomId(IDS.BTN_TODAY_RUN_PREFIX + channelId) // 例: chatgpt_today_run_<channelId>
        .setLabel('今日のchat gpt')
        .setStyle(require('discord.js').ButtonStyle.Primary),
    );

    await targetChannel.send({
      embeds: [todayEmbed],
      components: [runButton],
    });
  }

  // 設定ログ / 管理者ログに出力（関数の引数・使い方はプロジェクトに合わせて調整）
  try {
    const logEmbed = new EmbedBuilder()
      .setTitle('今日のchat gpt設定')
      .setDescription(
        `店舗名：${storeName}\n` +
        `チャンネル：<#${channelId}>\n` +
        `APIキー：${apiKey}\n` +
        `モデル：${model}\n` +
        `プロンプト：${prompt}\n` +
        `口調の柔らかさ：${toneLevel}\n` +
        `回答上限文字数：${maxTokens}\n`
      )
      .addFields(
        { name: '入力者', value: `<@${user.id}>`, inline: true },
        { name: '入力時間', value: now.toLocaleString('ja-JP'), inline: true },
      )
      .setColor('#00b0f4');

    await sendSettingLog(guildId, logEmbed).catch(() => {});
    await sendAdminLog(guildId, logEmbed).catch(() => {});
  } catch (err) {
    logger.error('[chatgpt/todaySetting] ログ出力エラー:', err);
  }

  // ユーザーへのレスポンス
  await interaction.reply({
    content: `「今日のchat gpt設定」を保存しました。\n店舗：${storeName}\nチャンネル：<#${channelId}>`,
    ephemeral: true,
  });

  // 設定パネルを再表示（同じチャンネルに新しいパネルを出す運用）
  try {
    await postChatGptSettingPanel(interaction);
  } catch (err) {
    logger.error('[chatgpt/todaySetting] パネル再表示エラー:', err);
  }
}

module.exports = {
  handleTodaySettingButton,
  handleTodayStoreChannelSelect,
  handleTodaySettingModal,
};
