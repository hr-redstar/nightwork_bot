// src/handlers/chat_gpt/panel.js
// ----------------------------------------------------
// /設定chat_gpt 用 「ChatGPT設定パネル」
//
// ・今日のchat gpt 一覧      : GCS/<guildId>/chatgpt/今日のchatgpt設定.json
// ・chatgpt回答チャンネル 一覧: GCS/<guildId>/chatgpt/回答チャンネル設定.json
//
// ボタン:
//   1列目: 今日のchat gpt設定 / 今日のchat gpt設定編集
//   2列目: chatgpt回答チャンネル設定
//   3列目: chat gpt使用率
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const logger = require('../../utils/logger');
const {
  loadTodaySettings,
  loadAnswerChannels,
} = require('../../utils/chat_gpt/gcsChatGptManager');
const { IDS } = require('./ids');

/**
 * 今日のchat gpt 一覧 用テキストを生成
 */
async function buildTodayListText(guildId) {
  try {
    const settings = await loadTodaySettings(guildId);

    if (!settings || settings.length === 0) {
      return '（まだ設定がありません）';
    }

    // settings: [{ storeName, channelId, model, prompt, toneLevel, maxTokens, ... }]
    const lines = settings.map((s, idx) => {
      const store = s.storeName || s.storeId || `店舗${idx + 1}`;
      const ch = s.channelId ? `<#${s.channelId}>` : 'チャンネル未設定';
      const model = s.model || 'モデル未設定';
      const tone =
        typeof s.toneLevel === 'number'
          ? `口調:${s.toneLevel}`
          : '口調:未設定';
      const maxLen =
        typeof s.maxTokens === 'number'
          ? `上限:${s.maxTokens}`
          : '上限:未設定';

      return `・${store}：${ch}（${model} / ${tone} / ${maxLen}）`;
    });

    return lines.join('\n');
  } catch (err) {
    logger.error('[chat_gpt/panel] buildTodayListText エラー:', err);
    return '（一覧の取得中にエラーが発生しました）';
  }
}

/**
 * chatgpt回答チャンネル 一覧 用テキストを生成
 */
async function buildAnswerChannelListText(guildId) {
  try {
    const channels = await loadAnswerChannels(guildId);

    if (!channels || channels.length === 0) {
      return '（まだ設定がありません）';
    }

    // channels: [{ storeId, storeName, channelId, apiKey, updatedAt, updatedBy }]
    const lines = channels.map((c, idx) => {
      const store = c.storeName || c.storeId || `店舗${idx + 1}`;
      const ch = c.channelId ? `<#${c.channelId}>` : 'チャンネル未設定';
      return `・${store}：${ch}`;
    });

    return lines.join('\n');
  } catch (err) {
    logger.error('[chat_gpt/panel] buildAnswerChannelListText エラー:', err);
    return '（一覧の取得中にエラーが発生しました）';
  }
}

/**
 * ChatGPT設定パネルを送信
 * @param {import('discord.js').TextChannel} channel
 */
async function postChatGptSettingPanel(channel) {
  const guildId = channel.guild.id;

  const todayListText = await buildTodayListText(guildId);
  const answerListText = await buildAnswerChannelListText(guildId);

  const descLines = [];

  descLines.push('今日のchat gpt 一覧');
  descLines.push(todayListText);
  descLines.push('');
  descLines.push('chatgpt回答チャンネル 一覧');
  descLines.push(answerListText);
  descLines.push('');
  descLines.push('プロンプト例：');
  descLines.push('周辺の天気やイベント内容を含みたい場合は、');
  descLines.push('「あなたは東京○○在住、筋肉マッチョのイケメン黒服です。」のような文章を入力して下さい。');

  const embed = new EmbedBuilder()
    .setTitle('🤖 ChatGPT設定パネル')
    .setDescription(descLines.join('\n'))
    .setColor('#00b0f4');

  // ボタン行
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_TODAY_SETTING) // 例: 'chatgpt_today_setting'
      .setLabel('今日のchat gpt設定')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(IDS.BTN_TODAY_SETTING_EDIT) // 例: 'chatgpt_today_setting_edit'
      .setLabel('今日のchat gpt設定編集')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_ANSWER_CHANNEL) // 例: 'chatgpt_answer_channel'
      .setLabel('chatgpt回答チャンネル設定')
      .setStyle(ButtonStyle.Primary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(IDS.BTN_USAGE) // 例: 'chatgpt_usage'
      .setLabel('chat gpt使用率')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    embeds: [embed],
    components: [row1, row2, row3],
  });
}

module.exports = {
  postChatGptSettingPanel,
};
