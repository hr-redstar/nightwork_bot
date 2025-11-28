// src/handlers/chat_gpt/panel.js
// ----------------------------------------------------
// ChatGPT設定パネルの表示
//   - 今日のchat gpt 一覧
//   - chatgpt回答チャンネル 一覧
//   - 各種ボタン
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const logger = require('../../utils/logger');
const { IDS } = require('./ids');
const {
  loadTodaySettings,
  loadAnswerChannels,
} = require('../../utils/chat_gpt/gcsChatGptManager');

// APIキーの表示用マスク
function maskApiKey(apiKey) {
  if (!apiKey) return '未設定';
  if (apiKey.length <= 8) return '****';
  const head = apiKey.slice(0, 4);
  const tail = apiKey.slice(-4);
  return `${head}****${tail}`;
}

// 「今日のchat gpt 一覧」テキスト生成
function buildTodaySettingsText(todaySettings) {
  if (!todaySettings || todaySettings.length === 0) {
    return '（まだ設定がありません）\n';
  }

  return todaySettings
    .map((s, index) => {
      const storeName = s.storeName || `店舗${index + 1}`;
      const channel = s.channelId ? `<#${s.channelId}>` : 'チャンネル未設定';
      const apiKeyView = maskApiKey(s.apiKey);
      const model = s.model || '未設定';
      const prompt = s.prompt || '（未設定）';
      const tone = typeof s.toneLevel === 'number' ? s.toneLevel : '未設定';
      const maxTokens = s.maxTokens || '未設定';

      // 「コピーできる形」を意識して、1ブロックごとにまとめて出力
      return (
        `店舗名：${storeName}　${channel}\n` +
        `APIキー：${apiKeyView}\n` +
        `モデル：${model}\n` +
        `プロンプト：${prompt}\n` +
        `口調の柔らかさ(0~2)：${tone}\n` +
        `回答上限文字数：${maxTokens}\n`
      );
    })
    .join('\n');
}

// 「chatgpt回答チャンネル 一覧」テキスト生成
function buildAnswerChannelText(answerChannels) {
  if (!answerChannels || answerChannels.length === 0) {
    return '（まだ設定がありません）\n';
  }

  return answerChannels
    .map((s, index) => {
      const storeName = s.storeName || `店舗${index + 1}`;
      const channel = s.channelId ? `<#${s.channelId}>` : 'チャンネル未設定';
      const apiKeyView = maskApiKey(s.apiKey);

      return (
        `店舗名：${storeName}　${channel}\n` +
        `APIキー：${apiKeyView}\n`
      );
    })
    .join('\n');
}

/**
 * ChatGPT設定パネルを送信
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ButtonInteraction} interaction
 */
async function postChatGptSettingPanel(interaction) {
  const guildId = interaction.guild.id;

  try {
    const todaySettings = await loadTodaySettings(guildId);
    const answerChannels = await loadAnswerChannels(guildId);

    const todayText = buildTodaySettingsText(todaySettings);
    const answerChannelText = buildAnswerChannelText(answerChannels);

    const desc =
      '**今日のchat gpt 一覧**\n' +
      todayText +
      '\n' +
      '**chatgpt回答チャンネル 一覧**\n' +
      answerChannelText +
      '\n' +
      'プロンプト例：\n' +
      '周辺の天気やイベント内容を含みたい場合は、\n' +
      '「あなたは東京○○在住、筋肉マッチョのイケメン黒服です。」のような文章を入力して下さい。\n';

    const embed = new EmbedBuilder()
      .setTitle('🤖 ChatGPT設定パネル')
      .setDescription(desc)
      .setColor('#00b0f4');

    // 1列目：今日のchat gpt設定 / 編集
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.BTN_TODAY_SETTING)
        .setLabel('今日のchat gpt設定')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(IDS.BTN_TODAY_EDIT)
        .setLabel('今日のchat gpt設定編集')
        .setStyle(ButtonStyle.Secondary),
    );

    // 2列目：回答チャンネル設定
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.BTN_ANSWER_CHANNEL)
        .setLabel('chatgpt回答チャンネル設定')
        .setStyle(ButtonStyle.Success),
    );

    // 3列目：使用率
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(IDS.BTN_USAGE)
        .setLabel('chat gpt使用率')
        .setStyle(ButtonStyle.Danger),
    );

    const payload = {
      embeds: [embed],
      components: [row1, row2, row3],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (err) {
    logger.error('[chat_gpt/panel] 設定パネル表示エラー:', err);

    const msg = {
      content: '⚠️ ChatGPT設定パネルの表示中にエラーが発生しました。',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
}

module.exports = {
  postChatGptSettingPanel,
};
