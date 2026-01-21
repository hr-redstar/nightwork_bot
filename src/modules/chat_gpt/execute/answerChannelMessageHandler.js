// src/handlers/chat_gpt/answerChannelMessageHandler.js
// ----------------------------------------------------
// ChatGPT「回答チャンネル」でユーザーが発言したら
//   - chatgpt/回答チャンネル設定.json から APIキー等取得
//   - chatgpt/今日のchatgpt設定.json から model / prompt / 口調 / 最大文字数取得
//   - chatgpt/config.json からデフォルト補完
//   - /メッセージファイル化 のログ（全期間）を読み込んでコンテキスト化
//   - ChatGPT へ投げて返信
//   - chatgpt/使用率/年月.json に usage を記録
// ----------------------------------------------------

const logger = require('../../../utils/logger');

const {
  loadAnswerChannels,
  loadTodaySettings,
  loadChatGptConfig,
  loadUsage,
  saveUsage,
} = require('../../../utils/chat_gpt/gcsChatGptManager');

const {
  buildThreadMessageLogContextForGuild,
  buildGuildAllChannelMessageLogContext,
  buildSelectedChannelsLogContext, // ★ 追加
} = require('../../../utils/chat_gpt/messageLogContext');

// OpenAI SDK
let OpenAI = null;
try {
  OpenAI = require('openai');
} catch (err) {
  logger.warn(
    '[answerChannelMessageHandler] openai パッケージが見つかりません。`npm i openai` を実行してください。'
  );
}

/**
 * toneLevel(0~2) を説明文に変換
 */
function toneDescription(toneLevel) {
  switch (toneLevel) {
    case 0:
      return '少し固めで敬語ベースの口調で話してください。';
    case 2:
      return 'かなり柔らかく、親しみやすい口調で話してください。';
    case 1:
    default:
      return '丁寧だが堅すぎない、自然な口調で話してください。';
  }
}

/**
 * 使用率を chatgpt/使用率/年月.json に加算
 */
async function addUsage(guildId, apiKey, model, totalTokens) {
  try {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const usage = await loadUsage(guildId, yearMonth);

    // apiKey をそのまま保存するのは怖いので末尾だけ
    const keyId = `key_${apiKey.slice(-8)}`;

    if (!usage[keyId]) {
      usage[keyId] = {
        models: {},
        totalTokens: 0,
        calls: 0,
      };
    }

    const entry = usage[keyId];
    entry.totalTokens += totalTokens || 0;
    entry.calls += 1;

    if (!entry.models[model]) {
      entry.models[model] = { tokens: 0, calls: 0 };
    }
    entry.models[model].tokens += totalTokens || 0;
    entry.models[model].calls += 1;

    await saveUsage(guildId, yearMonth, usage);
  } catch (err) {
    logger.error('[answerChannelMessageHandler] 使用率保存エラー:', err);
  }
}

/**
 * このメッセージが「ChatGPT回答チャンネル」かどうか判定し、
 * 該当するなら ChatGPT に投げて返信させる
 *
 * @param {import('discord.js').Message} message
 */
async function handleAnswerChannelMessage(message) {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const channelId = message.channel.id;

    // 1) 回答チャンネル設定からこのチャンネルの設定取得
    const answerChannels = await loadAnswerChannels(guildId);
    const answerEntry = answerChannels.find((c) => c.channelId === channelId);
    if (!answerEntry) return; // このチャンネルは回答チャンネルではない

    if (!OpenAI) {
      await message.reply(
        '⚠️ ChatGPT クライアントが正しく設定されていません。（openai パッケージ未インストール）'
      );
      return;
    }

    const apiKey = answerEntry.apiKey;
    const storeName = answerEntry.storeName || '店舗名未設定';

    // 2) chatgpt/config.json（デフォルト設定）読み込み
    const baseConfig = await loadChatGptConfig(guildId);
    const defaultModel = baseConfig.defaultModel || 'gpt-4.1-mini';
    const defaultMaxTokens = baseConfig.defaultMaxTokens || 800;
    const defaultToneLevel =
      typeof baseConfig.defaultToneLevel === 'number' ? baseConfig.defaultToneLevel : 1;

    // 3) 今日のchatgpt設定.json から、このチャンネルに対応する設定を探す
    const todaySettings = await loadTodaySettings(guildId);
    const todayEntry =
      todaySettings.find((s) => s.channelId === channelId) ||
      todaySettings.find((s) => s.storeId && s.storeId === answerEntry.storeId) ||
      null;

    const model = todayEntry?.model || defaultModel;
    const prompt = todayEntry?.prompt || baseConfig.defaultPrompt || '';
    const toneLevel =
      typeof todayEntry?.toneLevel === 'number' ? todayEntry.toneLevel : defaultToneLevel;
    const maxTokens = todayEntry?.maxTokens || defaultMaxTokens;

    const userMessage = message.content || '';

    // ----------------------------------------
    // 4) ログの取得ロジック
    //    - 今日の設定に contextChannelIds があればそれを優先
    //    - なければ、ギルド全体ログ / 回答チャンネルログで fallback
    // ----------------------------------------
    let logSectionText = '';
    let hearingSectionText = '';

    const contextChannelIds = todayEntry?.contextChannelIds;

    // 4-1. contextChannelIds が指定されている場合：そのチャンネルだけを読む
    if (Array.isArray(contextChannelIds) && contextChannelIds.length > 0) {
      const { allText, hearingText } = await buildSelectedChannelsLogContext(
        guildId,
        contextChannelIds,
        { maxCharsAll: 12000, maxCharsHearing: 4000 },
      );

      logSectionText = allText;
      hearingSectionText = hearingText;
    } else {
      // 4-2. 指定なしの場合は、既存ロジック（例：ギルド全体 + スレッドログ）で対応
      const guildChannelLogs = await buildGuildAllChannelMessageLogContext(guildId, {
        maxChars: 8000,
      });
      const guildThreadLog = await buildThreadMessageLogContextForGuild(guildId, {
        maxChars: 4000,
      });

      logSectionText = guildChannelLogs;
      hearingSectionText =
        '（ヒアリング報告用の絞り込みは contextChannelIds 設定時にのみ有効です）\n' +
        guildThreadLog;
    }

    // デバッグ用
    logger.info(`[answerChannelMessageHandler] [DEBUG] logSection: ${logSectionText.length} chars, hearingSection: ${hearingSectionText.length} chars`);

    // 5) ChatGPT 用のプロンプト組み立て
    const client = new OpenAI({ apiKey });

    const toneText = toneDescription(toneLevel);

    const systemPromptPieces = [
      `あなたはナイトワーク店舗「${storeName}」の黒服スタッフです。`,
      '店舗スタッフとして、ホスト・キャスト・黒服・オーナーなどの業務を理解し、',
      '来店状況や顧客とのやり取り、店舗運営の改善に役立つアドバイスを行います。',
      toneText,
      '返答は日本語で行ってください。',
    ];
    if (prompt) {
      systemPromptPieces.push('追加のキャラクター設定や指示は次の通りです:');
      systemPromptPieces.push(prompt);
    }

    const systemPrompt = systemPromptPieces.join('\n');

    const userPrompt =
      '【ヒアリング報告らしきログ（優先して参照してください）】\n' +
      hearingSectionText +
      '\n\n' +
      '【参照対象のメッセージログ】\n' +
      logSectionText +
      '\n\n' +
      '【今回のユーザーからのメッセージ】\n' +
      userMessage +
      '\n\n' +
      '上記を踏まえて、ユーザーからの質問や指示に答えてください。\n' +
      '特に「ヒアリング報告」「保存されている内容」などについて聞かれた場合は、\n' +
      'まず「ヒアリング報告らしきログ」のセクションから該当しそうな内容を探し、要約・抜粋して回答してください。';

    // 6) ChatGPT 呼び出し
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    });

    const replyText = completion.choices?.[0]?.message?.content?.trim();
    if (!replyText) {
      await message.reply('⚠️ ChatGPT から有効な応答を取得できませんでした。');
      return;
    }

    await message.reply(replyText);

    // 7) 使用率を保存
    const totalTokens = completion.usage?.total_tokens || 0;
    await addUsage(guildId, apiKey, model, totalTokens);
  } catch (err) {
    logger.error('[answerChannelMessageHandler] エラー:', err);
    try {
      await message.reply('⚠️ ChatGPT応答中にエラーが発生しました。');
    } catch {
      // ignore
    }
  }
}

module.exports = {
  handleAnswerChannelMessage,
};